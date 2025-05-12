import { Component, inject, OnInit, signal } from '@angular/core';
import { TodosService } from '../services/todos.service';
import { Todo } from '../components/model/todo.type';
import { catchError } from 'rxjs';
import { TodoItemComponent } from "../components/todo-item/todo-item.component";

@Component({
  selector: 'app-todos',
  imports: [TodoItemComponent],
  templateUrl: './todos.component.html',
  styleUrl: './todos.component.css'
})

export class TodosComponent implements OnInit {
  todoService = inject(TodosService);
  todoItems = signal<Array<Todo>>([]);

  ngOnInit(): void {
    //console.log(this.todoService.todoItems)
    this.todoService.getTodosFromAPI()
        .pipe(
          catchError((err) => {
            console.log(err);
            throw err;
          }) 
        ).subscribe((todo) => {
          this.todoItems.set(todo);
        });
  }

  updateTodoItem(todoItem: Todo) {
    console.log('hi')
    this.todoItems.update((todos) => {
      return todos.map((todo) => {
        if (todo.id === todoItem.id) {
          return {
            ...todo,
            completed: !todo.completed,
          };
        }
        return todo;
      });
    });
  }
}
