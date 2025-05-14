import { Component, ElementRef, input, output, Signal, viewChild, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Needed for ngModel
import { CommonModule } from '@angular/common'; // Needed for *ngFor

@Component({
  selector: 'app-guess-input',
  standalone: true, // Assuming standalone
  imports: [CommonModule, FormsModule], // Import necessary modules
  templateUrl: './guess-input.component.html',
  styleUrl: './guess-input.component.css'
})
export class GuessInputComponent {

  // Input property to receive feedback for each letter from the parent
  // Expected format: "GYR__" (5 characters)
  feedbacks = input<string>("");

  // Input property to control if the input boxes in this row are disabled
  disabled = input<boolean>(false);

  // Output event emitter to send the completed 5-letter guess to the parent
  wordInputted = output<string>();

  // Signals to hold the value of each individual input box
  // Initialize with empty strings
  guessLetters = [signal(""), signal(""), signal(""), signal(""), signal("")];

  // viewChild to get a reference to the form element in the template
  // This is used to find the individual input elements for focusing.
  form: Signal<ElementRef | undefined> = viewChild('guessForm'); // Template reference variable name

  // Effect to clear inputs when the disabled state changes (e.g., new game starts)
  // and the row becomes enabled again.
  // This helps reset the input boxes visually.
  private clearInputsEffect = effect(() => {
      const isDisabled = this.disabled();
      // If the row becomes enabled (and was previously disabled, or on initial load)
      // and there are existing values, clear them.
      // Add a check to ensure this doesn't interfere with feedback display.
      // Only clear if the row is enabled AND there's no feedback applied yet.
      if (!isDisabled && !this.feedbacks()) {
          this.guessLetters.forEach(sig => sig.set(""));
          console.log("Cleared inputs due to disabled state change.");
      }
  });


  /**
   * Handles input in a single letter box. Moves focus to the next box if a character is entered.
   * Also checks if the full 5-letter word is entered and submits it.
   * @param event The input event.
   * @param currentIndex The index of the input box that triggered the event.
   */
  handleInput(event: Event, currentIndex: number): void {
     const inputElement = event.target as HTMLInputElement;
     const value = inputElement.value.toUpperCase(); // Convert to uppercase immediately
     this.guessLetters[currentIndex].set(value); // Update the signal

     console.log(`Input at index ${currentIndex}: ${value}`);

     // Move focus to the next input if a character was entered and it's not the last input
     if (value && currentIndex < this.guessLetters.length - 1) {
         const formElement = this.form();
         if (formElement) {
             // Find the next input element using its index
             const nextInput = formElement.nativeElement.querySelectorAll('input')[currentIndex + 1] as HTMLInputElement;
             if (nextInput) {
                 nextInput.focus();
             }
         }
     }

     // Check if all inputs have a value (a full 5-letter word is entered)
     const currentGuess = this.guessLetters.map(sig => sig()).join("");
     if (currentGuess.length === 5) {
        // Automatically submit the guess once 5 letters are entered
        this.submitGuess();
     }
  }

  /**
   * Handles keydown events, specifically for Backspace to move focus to the previous input.
   * @param event The keyboard event.
   * @param currentIndex The index of the input box.
   */
  handleKeydown(event: KeyboardEvent, currentIndex: number): void {
      // If Backspace is pressed and the current input is empty, move to the previous input
      if (event.key === 'Backspace' && !this.guessLetters[currentIndex]()) {
          if (currentIndex > 0) {
              const formElement = this.form();
              if (formElement) {
                  const prevInput = formElement.nativeElement.querySelectorAll('input')[currentIndex - 1] as HTMLInputElement;
                  if (prevInput) {
                      prevInput.focus();
                      // Optional: Clear the value of the previous input when moving back
                      // this.guessLetters[currentIndex - 1].set("");
                  }
              }
          }
      }
      // Optional: Prevent entering more than one character
      if (event.key.length === 1 && this.guessLetters[currentIndex]().length >= 1) {
           event.preventDefault();
      }
  }


  /**
   * Submits the current 5-letter guess.
   * This is called automatically when 5 letters are entered or manually if needed.
   */
  submitGuess(): void {
    const guess = this.guessLetters.map(sig => sig()).join("");
    // Only emit if the guess is exactly 5 letters long
    if (guess.length === 5) {
      this.wordInputted.emit(guess);
       // The parent component will handle disabling this row and moving to the next
    } else {
      console.warn("Guess must be 5 letters long to submit.");
       // Optionally, provide user feedback
    }
  }

  /**
   * Focuses the first input element in this component's form.
   * Called by the parent component (WordleComponent) to move focus to this row.
   */
  focusToFirstInput(): void {
    const formElement = this.form();
    if (formElement) {
      console.log("Focusing first input in guess row.");
      // Find the first input element within the form
      const firstInput = formElement.nativeElement.querySelector('input') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }
  }

  /**
   * Determines the CSS class for a letter box based on the feedback received from the parent.
   * @param idx The index of the letter/feedback.
   * @returns The CSS class ('red', 'yellow', 'green', or '')
   */
  decideClassFromFeedback(idx: number): string {
    // Get the feedback character for this index
    const feedbackChar = this.feedbacks()[idx];
    switch (feedbackChar) {
      case 'R': return 'red';
      case 'Y': return 'yellow';
      case 'G': return 'green';
      default: return ''; // No class if feedback is empty or unknown
    }
  }
}
