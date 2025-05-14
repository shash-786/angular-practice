import { Component, inject, signal, viewChildren, AfterViewInit } from '@angular/core';
import { GuessInputComponent } from "../components/guess-input/guess-input.component"; // Adjust path if needed
import { FormsModule } from '@angular/forms'; // Needed for ngModel in template (if used directly)
import { CommonModule } from '@angular/common'; // Needed for Angular directives like *ngFor, *ngIf

// Define a simple type for guess feedback
interface GuessFeedback {
  guess: string;
  feedback: string; // e.g., "GYR__"
  isCorrect: boolean;
  answer?: string; // Optional: revealed on loss
}

@Component({
  selector: 'app-wordle', // Your component's selector
  standalone: true, // Assuming standalone
  imports: [CommonModule, FormsModule, GuessInputComponent], // Import necessary modules and GuessInputComponent
  templateUrl: './wordle.component.html',
  styleUrl: './wordle.component.css'
})
export class WordleComponent implements AfterViewInit {

  // The secret word to guess (hardcoded for simplicity without a service)
  // In a real app, this would come from a service/backend
  private readonly secretWord = "ANGLE"; // Example word (must be 5 letters for standard Wordle)
  private readonly wordLength = 5; // Standard Wordle word length
  public readonly maxGuesses = 6; // Standard Wordle max guesses

  // State signals
  historicFeedbacks = signal<GuessFeedback[]>([]); // Stores feedback for each attempt
  currentGuessIndex = signal<number>(0); // Tracks the current guess attempt number (0-indexed)
  isGameOver = signal<boolean>(false); // Indicates if the game has ended
  gameMessage = signal<string>(''); // Message displayed to the user (win/loss)

  // viewChildren to get references to all GuessInputComponent instances
  guessInputComponents = viewChildren(GuessInputComponent);

  // Lifecycle hook to focus the first input after the view is initialized
  ngAfterViewInit(): void {
    // Use a small timeout to ensure viewChildren are fully rendered
    setTimeout(() => {
      this.focusCurrentGuessInput();
    }, 0);
  }

  /**
   * Handles the submission of a guess from a GuessInputComponent.
   * @param guess The 5-letter word guessed by the user.
   * @param index The index of the guess attempt (row number).
   */
  submitGuess(guess: string, index: number): void {
    // Basic validation: ensure it's the current row and the guess is 5 letters
    if (index !== this.currentGuessIndex() || guess.length !== this.wordLength) {
      console.warn("Invalid guess submission.");
      return;
    }

    console.log(`Submitted guess: ${guess} for attempt ${index + 1}`);

    // Process the guess and generate feedback (Simplified logic)
    const feedback = this.generateFeedback(guess.toUpperCase(), this.secretWord.toUpperCase());

    // Add the feedback to the history
    this.historicFeedbacks.update(feedbacks => [...feedbacks, {
      guess: guess.toUpperCase(),
      feedback: feedback,
      isCorrect: feedback === 'G'.repeat(this.wordLength) // Check if all letters are correct
    }]);

    // Check for game over conditions
    const isWin = feedback === 'G'.repeat(this.wordLength);
    const isLoss = this.currentGuessIndex() === this.maxGuesses - 1 && !isWin;

    if (isWin) {
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
    return this.historicFeedbacks()[index]?.feedback || '';
  }

  /**
   * Determines if a guess input row should be disabled.
   * It should be disabled if it's before the current guess, or if the game is over.
   * @param index The index of the guess attempt (row).
   * @returns True if the input row should be disabled, false otherwise.
   */
  isInputDisabled(index: number): boolean {
    return index < this.currentGuessIndex() || this.isGameOver();
  }

  /**
   * Focuses the first input element of the current guess row.
   */
  private focusCurrentGuessInput(): void {
    const currentInputComponent = this.guessInputComponents()[this.currentGuessIndex()];
    if (currentInputComponent) {
      currentInputComponent.focusToFirstInput();
    }
  }

  /**
   * Starts a new game. Resets the game state.
   */
  startNewGame(): void {
    this.historicFeedbacks.set([]);
    this.currentGuessIndex.set(0);
    this.isGameOver.set(false);
    this.gameMessage.set('');
    // Reset guess inputs in all rows (optional, they will be cleared when new game starts)
    // Focus the first input of the first row
     setTimeout(() => { // Use timeout to ensure viewChildren are fully rendered
        this.focusCurrentGuessInput();
     }, 0);
  }
}
