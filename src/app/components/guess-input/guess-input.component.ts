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

  feedbacks = input<string>("");
  disabled = input<boolean>(false);
  wordInputted = output<string>();
  guessLetters = [signal(""), signal(""), signal(""), signal(""), signal("")];
  form: Signal<ElementRef | undefined> = viewChild('guessForm'); // Template reference variable name

  private clearInputsEffect = effect(() => {
      const isDisabled = this.disabled();
      const currentFeedback = this.feedbacks();

      if (!isDisabled && !currentFeedback) {
          this.clearInputs(); // Use the updated clearInputs method
          console.log("Cleared inputs due to state change.");
      }
  });


  handleInput(event: Event, currentIndex: number): void {
     const inputElement = event.target as HTMLInputElement;
     const value = inputElement.value.slice(-1).toUpperCase();
     inputElement.value = value; // Update the input element's value directly

     this.guessLetters[currentIndex].set(value); // Update the signal

     console.log(`Input at index ${currentIndex}: ${value}`);

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

     const currentGuess = this.guessLetters.map(sig => sig()).join("");
     if (currentGuess.length === 5) {
        this.submitGuess();
     }
  }

  handleKeydown(event: KeyboardEvent, currentIndex: number): void {
      if (event.key === 'Backspace' && !this.guessLetters[currentIndex]()) {
          if (currentIndex > 0) {
              const formElement = this.form();
              if (formElement) {
                  const prevInput = formElement.nativeElement.querySelectorAll('input')[currentIndex - 1] as HTMLInputElement;
                  if (prevInput) {
                      prevInput.focus();
                  }
              }
          }
      }
      if (event.key.length === 1 && this.guessLetters[currentIndex]().length >= 1 && event.key !== 'Backspace' && !event.metaKey && !event.ctrlKey && !event.altKey) {
           event.preventDefault();
      }
  }


  submitGuess(): void {
    const guess = this.guessLetters.map(sig => sig()).join("");
    if (guess.length === 5) {
      this.wordInputted.emit(guess);
    } else {
      console.warn("Guess must be 5 letters long to submit.");
    }
  }

   clearInputs(): void {
       this.guessLetters.forEach(sig => sig.set(""));

       const formElement = this.form();
       if (formElement) {
           const inputs = formElement.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
           inputs.forEach(input => input.value = "");
       }


       this.focusToFirstInput();
   }


  focusToFirstInput(): void {
    const formElement = this.form();
    if (formElement) {
      console.log("Attempting to focus first input in guess row.");
      const firstInput = formElement.nativeElement.querySelector('input') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      } else {
          console.warn("First input element not found in the form.");
      }
    } else {
        console.warn("Form element reference not available.");
    }
  }

  decideClassFromFeedback(idx: number): string {
    const feedbackChar = this.feedbacks()[idx];
    switch (feedbackChar) {
      case 'R': return 'red';
      case 'Y': return 'yellow';
      case 'G': return 'green';
      default: return ''; // No class if feedback is empty or unknown
    }
  }
}