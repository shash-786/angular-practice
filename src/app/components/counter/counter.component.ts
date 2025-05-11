import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  imports: [],
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.css'
})
export class CounterComponent {
  cnt = signal(0);
  increment() : void {
    this.cnt.update(value => value + 1)
  }
  reset() : void {
    this.cnt.set(0)
  }
  decrement() : void {
    this.cnt.update(value => value - 1)
  }
}
