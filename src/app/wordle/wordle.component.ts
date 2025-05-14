import { Component, inject, signal, viewChildren, AfterViewInit, OnInit } from '@angular/core';
import { GuessInputComponent } from "../components/guess-input/guess-input.component"; 
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http'; 

interface GuessFeedback {
  guess: string;
  feedback: string; // e.g., "GYR__"
  isCorrect: boolean;
  answer?: string; 
  isValidGuess?: boolean; 
}

@Component({
  selector: 'app-wordle', 
  standalone: true, 
  imports: [CommonModule, FormsModule, GuessInputComponent],
  templateUrl: './wordle.component.html',
  styleUrl: './wordle.component.css'
})
export class WordleComponent implements OnInit, AfterViewInit {

  // --- Word Lists (will be loaded) ---
  private secretWordsList: string[] = []; // List for selecting the secret word
  private validGuessesSet: Set<string> = new Set(); // Set for efficient guess validation

  // The secret word to guess
  private secretWord: string = '';

  private readonly wordLength = 5; 
  public readonly maxGuesses = 6; 

  // State signals
  historicFeedbacks = signal<GuessFeedback[]>([]); // Stores feedback for each attempt
  currentGuessIndex = signal<number>(0); 
  isGameOver = signal<boolean>(false); 
  gameMessage = signal<string>(''); // Message displayed to the user (win/loss)
  isLoading = signal<boolean>(true); // Indicates if word lists are being loaded
  errorMessage = signal<string>(''); // To display errors (e.g., loading files)

  guessInputComponents = viewChildren(GuessInputComponent);

  private http = inject(HttpClient);

  ngOnInit(): void {
    this.loadWordLists();
  }

  ngAfterViewInit(): void {
  }

  private async loadWordLists(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(''); 

    try {
      const secretWordsText = await this.http.get('assets/words.txt', { responseType: 'text' }).toPromise();
      if (secretWordsText) {
          this.secretWordsList = secretWordsText.split('\n')
                                                 .map(word => word.trim().toUpperCase())
                                                 .filter(word => word.length === this.wordLength);
          console.log(`Loaded ${this.secretWordsList.length} secret words.`);
      } else {
           throw new Error('Failed to load secret words list.');
      }


      const validGuessesText = await this.http.get('assets/valid-wordle-words.txt', { responseType: 'text' }).toPromise();
       if (validGuessesText) {
           this.validGuessesSet = new Set(validGuessesText.split('\n')
                                                        .map(word => word.trim().toUpperCase())
                                                        .filter(word => word.length === this.wordLength));
           console.log(`Loaded ${this.validGuessesSet.size} valid guess words.`);
       } else {
           throw new Error('Failed to load valid guess words list.');
       }


      this.startNewGame();
      this.isLoading.set(false);

       setTimeout(() => { 
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

  private selectRandomWord(): string {
    if (this.secretWordsList.length === 0) {
       console.error("Secret words list is empty. Cannot select a random word.");
       this.errorMessage.set("Internal Error: Secret word list is empty.");
       this.isGameOver.set(true);
       return ""; 
    }
    const randomIndex = Math.floor(Math.random() * this.secretWordsList.length);
    return this.secretWordsList[randomIndex];
  }

  submitGuess(guess: string, index: number): void {
     if (this.isLoading() || this.isGameOver() || index !== this.currentGuessIndex() || guess.length !== this.wordLength) {
       console.warn("Invalid guess submission or game state.");
       return;
     }

    const upperGuess = guess.toUpperCase();

    if (!this.validGuessesSet.has(upperGuess)) {
        console.warn(`Invalid guess: "${guess}". Not in the valid words list.`);
        this.gameMessage.set(`"${guess}" is not a valid word.`);
        this.historicFeedbacks.update(feedbacks => [...feedbacks, {
          guess: upperGuess,
          feedback: '', 
          isCorrect: false,
          isValidGuess: false 
        }]);
         const currentInputComponent = this.guessInputComponents()[this.currentGuessIndex()];
         if (currentInputComponent) {
             currentInputComponent.clearInputs(); // Add a method to GuessInputComponent
         }
        return; 
    }

    this.gameMessage.set('');


    console.log(`Submitted valid guess: ${upperGuess} for attempt ${index + 1}`);

    const feedback = this.generateFeedback(upperGuess, this.secretWord.toUpperCase());

    const isCorrect = feedback === 'G'.repeat(this.wordLength);
    this.historicFeedbacks.update(feedbacks => [...feedbacks, {
      guess: upperGuess,
      feedback: feedback,
      isCorrect: isCorrect,
      answer: isCorrect ? undefined : this.secretWord.toUpperCase(), // Only show answer on loss
      isValidGuess: true // Mark as valid
    }]);

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
      this.currentGuessIndex.update(current => current + 1);
      setTimeout(() => { // Use timeout to ensure the next component is ready
         this.focusCurrentGuessInput();
      }, 0);
    }
  }

  private generateFeedback(guess: string, secret: string): string {
    const feedbackArray: string[] = Array(this.wordLength).fill('R'); // Initialize with 'R'
    const secretLetters: (string | null)[] = secret.split(''); // Use null to mark used letters

    for (let i = 0; i < this.wordLength; i++) {
      if (guess[i] === secretLetters[i]) {
        feedbackArray[i] = 'G';
        secretLetters[i] = null; // Mark this letter in the secret as used
      }
    }

    for (let i = 0; i < this.wordLength; i++) {
      // Skip if already marked Green
      if (feedbackArray[i] === 'G') {
        continue;
      }

      const secretIndex = secretLetters.indexOf(guess[i]);
      if (secretIndex > -1) {
        feedbackArray[i] = 'Y';
        secretLetters[secretIndex] = null; // Mark this letter in the secret as used
      }
    }

    return feedbackArray.join('');
  }

  getFeedbackForAttempt(index: number): string {
      const feedbackEntry = this.historicFeedbacks()[index];
      return feedbackEntry?.isValidGuess ? feedbackEntry.feedback : '';
  }

  isInputDisabled(index: number): boolean {
    // Disable if loading, game is over, or it's a row before the current one
    return this.isLoading() || this.isGameOver() || index < this.currentGuessIndex();
  }

  private focusCurrentGuessInput(): void {
    if (!this.isLoading() && !this.isGameOver() && this.guessInputComponents().length > this.currentGuessIndex()) {
        const currentInputComponent = this.guessInputComponents()[this.currentGuessIndex()];
        if (currentInputComponent) {
          currentInputComponent.focusToFirstInput();
        }
    }
  }

  startNewGame(): void {
      if (this.secretWordsList.length === 0 || this.validGuessesSet.size === 0) {
          console.log("Word lists not loaded, attempting to reload...");
          this.loadWordLists(); 
          return; 
      }

      this.secretWord = this.selectRandomWord(); 
      console.log("New secret word:", this.secretWord); 

      this.historicFeedbacks.set([]);
      this.currentGuessIndex.set(0);
      this.isGameOver.set(false);
      this.gameMessage.set('');
      this.errorMessage.set(''); 

       setTimeout(() => { 
          this.focusCurrentGuessInput();
       }, 0);
  }
}
