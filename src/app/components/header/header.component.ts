import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TodosService } from '../../services/todos.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})

export class HeaderComponent {
  title = signal('My first angular App')
}
