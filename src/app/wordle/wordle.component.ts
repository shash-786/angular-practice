import { Component, inject, signal, viewChildren, AfterViewInit, OnInit } from '@angular/core';
import { GuessInputComponent } from "../components/guess-input/guess-input.component"; // Adjust path if needed
import { FormsModule } from '@angular/forms'; // Needed for ngModel in template (if used directly)
import { CommonModule } from '@angular/common'; // Needed for Angular directives like *ngFor, *ngIf
import { HttpClient } from '@angular/common/http'; // Needed to fetch files

// Define a simple type for guess feedback
interface GuessFeedback {
  guess: string;
  feedback: string; // e.g., "GYR__"
  isCorrect: boolean;
  answer?: string; // Optional: revealed on loss
  isValidGuess?: boolean; // Added to track if the submitted guess was valid
}

@Component({
  selector: 'app-wordle', // Your component's selector
  standalone: true, // Assuming standalone
  imports: [CommonModule, FormsModule, GuessInputComponent], // Import necessary modules including HttpClientModule
  templateUrl: './wordle.component.html',
  styleUrl: './wordle.component.css'
})
export class WordleComponent implements OnInit, AfterViewInit {

  // --- Word Lists (will be loaded) ---
  private secretWordsList: string[] = []; // List for selecting the secret word
  private validGuessesSet: Set<string> = new Set(); // Set for efficient guess validation

  // The secret word to guess
  private secretWord: string = '';

  private readonly wordLength = 5; // Standard Wordle word length
  public readonly maxGuesses = 6; // Standard Wordle max guesses

  // State signals
  historicFeedbacks = signal<GuessFeedback[]>([]); // Stores feedback for each attempt
  currentGuessIndex = signal<number>(0); // Tracks the current guess attempt number (0-indexed)
  isGameOver = signal<boolean>(false); // Indicates if the game has ended
  gameMessage = signal<string>(''); // Message displayed to the user (win/loss)
  isLoading = signal<boolean>(true); // Indicates if word lists are being loaded
  errorMessage = signal<string>(''); // To display errors (e.g., loading files)

  // viewChildren to get references to all GuessInputComponent instances
  guessInputComponents = viewChildren(GuessInputComponent);

  // Inject HttpClient to fetch files from assets
  private http = inject(HttpClient);

  // Lifecycle hook to load word lists when the component initializes
  ngOnInit(): void {
    this.loadWordLists();
  }

  // Lifecycle hook to focus the first input after the view is initialized and lists are loaded
  ngAfterViewInit(): void {
    // We need to wait for loading to finish before focusing
    // This is handled within the loadWordLists success callback
  }

  /**
   * Loads the secret word list and the valid guesses list from the assets folder.
   */
  private async loadWordLists(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(''); // Clear previous errors

    try {
      // Fetch secret words list
      const secretWordsText = await this.http.get('assets/words.txt', { responseType: 'text' }).toPromise();
      if (secretWordsText) {
          this.secretWordsList = secretWordsText.split('\n')
                                                 .map(word => word.trim().toUpperCase())
                                                 .filter(word => word.length === this.wordLength);
          console.log(`Loaded ${this.secretWordsList.length} secret words.`);
      } else {
           throw new Error('Failed to load secret words list.');
      }


      // Fetch valid guesses list
      const validGuessesText = await this.http.get('assets/valid-wordle-words.txt', { responseType: 'text' }).toPromise();
       if (validGuessesText) {
           this.validGuessesSet = new Set(validGuessesText.split('\n')
                                                        .map(word => word.trim().toUpperCase())
                                                        .filter(word => word.length === this.wordLength));
           console.log(`Loaded ${this.validGuessesSet.size} valid guess words.`);
       } else {
           throw new Error('Failed to load valid guess words list.');
       }


      // Start the game once lists are loaded
      this.startNewGame();
      this.isLoading.set(false);

      // Focus the first input after loading and starting a new game
       setTimeout(() => { // Use timeout to ensure viewChildren are fully rendered
          this.focusCurrentGuessInput();
       }, 0);


    } catch (error: any) {
      console.error('Error loading word lists:', error);
      this.errorMessage.set(`Failed to load game data. Please check the console. ${error.message || ''}`);
      this.isLoading.set(false); // Stop loading even on error
      this.isGameOver.set(true); // Prevent playing if data didn't load
      this.gameMessage.set('Game data could not be loaded.');
    }
  }

  /**
   * Selects a random word from the loaded secret words list.
   * Assumes the list has been successfully loaded.
   * @returns A random 5-letter word.
   */
  private selectRandomWord(): string {
    if (this.secretWordsList.length === 0) {
       console.error("Secret words list is empty. Cannot select a random word.");
       this.errorMessage.set("Internal Error: Secret word list is empty.");
       this.isGameOver.set(true);
       return ""; // Return empty or handle error appropriately
    }
    const randomIndex = Math.floor(Math.random() * this.secretWordsList.length);
    return this.secretWordsList[randomIndex];
  }

  /**
   * Handles the submission of a guess from a GuessInputComponent.
   * @param guess The 5-letter word guessed by the user.
   * @param index The index of the guess attempt (row number).
   */
  submitGuess(guess: string, index: number): void {
    // Prevent submission if loading, game is over, or it's not the current row
     if (this.isLoading() || this.isGameOver() || index !== this.currentGuessIndex() || guess.length !== this.wordLength) {
       console.warn("Invalid guess submission or game state.");
       return;
     }

    const upperGuess = guess.toUpperCase();

    // --- Validation: Check if the guess is in the valid words list ---
    if (!this.validGuessesSet.has(upperGuess)) {
        console.warn(`Invalid guess: "${guess}". Not in the valid words list.`);
        this.gameMessage.set(`"${guess}" is not a valid word.`);
        // Optionally, do not increment guess index or add feedback for invalid words
        // For now, we'll add a feedback entry but mark it as invalid
        this.historicFeedbacks.update(feedbacks => [...feedbacks, {
          guess: upperGuess,
          feedback: '', // No feedback for invalid words
          isCorrect: false,
          isValidGuess: false // Mark as invalid
        }]);
         // Do NOT move to the next row or check win/loss for invalid guesses
         // Clear the current row's input for the user to try again
         const currentInputComponent = this.guessInputComponents()[this.currentGuessIndex()];
         if (currentInputComponent) {
             currentInputComponent.clearInputs(); // Add a method to GuessInputComponent
         }
        return; // Stop processing here if the word is invalid
    }

    // If the guess is valid, clear any previous invalid guess message
    this.gameMessage.set('');


    console.log(`Submitted valid guess: ${upperGuess} for attempt ${index + 1}`);

    // Process the guess and generate feedback
    const feedback = this.generateFeedback(upperGuess, this.secretWord.toUpperCase());

    // Add the feedback to the history, marking as valid
    const isCorrect = feedback === 'G'.repeat(this.wordLength);
    this.historicFeedbacks.update(feedbacks => [...feedbacks, {
      guess: upperGuess,
      feedback: feedback,
      isCorrect: isCorrect,
      answer: isCorrect ? undefined : this.secretWord.toUpperCase(), // Only show answer on loss
      isValidGuess: true // Mark as valid
    }]);

    // Check for game over conditions
    const isLoss = this.currentGuessIndex() === this.maxGuesses - 1 && !isCorrect;

    if (isCorrect) {
      this.isGameOver.set(true);
      this.gameMessage.set('Congratulations! You guessed the word!');
      console.log("Game Won!");
    } else if (isLoss) {
      this.isGameOver.set(true);
      this.gameMessage.set(`Game Over! The word was "${this.secretWord.toUpperCase()}".`);
      console.log("Game Lost!");
    } else {
      // Game is not over, move to the next guess
      this.currentGuessIndex.update(current => current + 1);
      // Focus the next input row
      setTimeout(() => { // Use timeout to ensure the next component is ready
         this.focusCurrentGuessInput();
      }, 0);
    }
  }

  /**
   * Generates the Wordle feedback string (G, Y, R) for a given guess.
   * G: Correct letter in the correct position.
   * Y: Correct letter in the wrong position.
   * R: Incorrect letter.
   * @param guess The user's guess (uppercase).
   * @param secret The secret word (uppercase).
   * @returns A string of feedback characters (e.g., "GRY_R").
   */
  private generateFeedback(guess: string, secret: string): string {
    const feedbackArray: string[] = Array(this.wordLength).fill('R'); // Initialize with 'R'
    const secretLetters: (string | null)[] = secret.split(''); // Use null to mark used letters

    // First pass: Check for correct position (Green - G)
    for (let i = 0; i < this.wordLength; i++) {
      if (guess[i] === secretLetters[i]) {
        feedbackArray[i] = 'G';
        secretLetters[i] = null; // Mark this letter in the secret as used
      }
    }

    // Second pass: Check for correct letter, wrong position (Yellow - Y)
    for (let i = 0; i < this.wordLength; i++) {
      // Skip if already marked Green
      if (feedbackArray[i] === 'G') {
        continue;
      }

      // Check if the letter exists elsewhere in the secret word (and hasn't been used)
      const secretIndex = secretLetters.indexOf(guess[i]);
      if (secretIndex > -1) {
        feedbackArray[i] = 'Y';
        secretLetters[secretIndex] = null; // Mark this letter in the secret as used
      }
    }

    return feedbackArray.join('');
  }

  /**
   * Gets the feedback string for a specific guess attempt index.
   * Used by the template to pass feedback to the GuessInputComponent.
   * @param index The index of the guess attempt.
   * @returns The feedback string or empty string if no feedback exists for that index.
   */
  getFeedbackForAttempt(index: number): string {
      // Only return feedback if the guess was valid
      const feedbackEntry = this.historicFeedbacks()[index];
      return feedbackEntry?.isValidGuess ? feedbackEntry.feedback : '';
  }

   /**
   * Determines if a guess input row should be disabled.
   * It should be disabled if it's before the current guess, or if the game is over.
   * @param index The index of the guess attempt (row).
   * @returns True if the input row should be disabled, false otherwise.
   */
  isInputDisabled(index: number): boolean {
    // Disable if loading, game is over, or it's a row before the current one
    return this.isLoading() || this.isGameOver() || index < this.currentGuessIndex();
  }

  /**
   * Focuses the first input element of the current guess row.
   */
  private focusCurrentGuessInput(): void {
     // Ensure the view children are available and the current index is valid
     // Also ensure the game is not over and not loading
    if (!this.isLoading() && !this.isGameOver() && this.guessInputComponents().length > this.currentGuessIndex()) {
        const currentInputComponent = this.guessInputComponents()[this.currentGuessIndex()];
        if (currentInputComponent) {
          currentInputComponent.focusToFirstInput();
        }
    }
  }

  /**
   * Starts a new game. Resets the game state and selects a new random word.
   * Reloads word lists if they weren't loaded initially (e.g., first load failed).
   */
  startNewGame(): void {
      // If word lists haven't been loaded successfully, try loading them again
      if (this.secretWordsList.length === 0 || this.validGuessesSet.size === 0) {
          console.log("Word lists not loaded, attempting to reload...");
          this.loadWordLists(); // This will call startNewGame again on success
          return; // Exit this call
      }

      // Proceed with starting a new game if lists are loaded
      this.secretWord = this.selectRandomWord(); // Select a NEW random word
      console.log("New secret word:", this.secretWord); // Log the new word

      this.historicFeedbacks.set([]);
      this.currentGuessIndex.set(0);
      this.isGameOver.set(false);
      this.gameMessage.set('');
      this.errorMessage.set(''); // Clear errors on new game

      // Focus the first input of the first row for the new game
       setTimeout(() => { // Use timeout to ensure viewChildren are fully rendered
          this.focusCurrentGuessInput();
       }, 0);
  }
}
