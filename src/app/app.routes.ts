import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path:'',
        pathMatch:'full',
        loadComponent: () => {
            return import('./home/home.component').then((m) => m.HomeComponent)
        },
    },
    {
        path:'todos',
        loadComponent: () => {
            return import('./todos/todos.component').then((m) => m.TodosComponent)
        },
    },
    {
        path:'wordle',
        loadComponent: () => {
            return import('./wordle/wordle.component').then((m) => m.WordleComponent)
        },
    },
];
