import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'councillor' },
  {
    path: 'councillor',
    title: "Who's deciding · Ward 11",
    loadComponent: () => import('./features/councillor/councillor').then((m) => m.Councillor),
  },
  {
    path: 'budget',
    title: 'Where my money goes · Ward 11',
    loadComponent: () => import('./features/budget/budget').then((m) => m.Budget),
  },
  { path: '**', redirectTo: '' },
];
