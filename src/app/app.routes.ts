import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'councillor' },
  {
    path: 'councillor',
    title: "Who's deciding · Mississauga",
    loadComponent: () => import('./features/councillor/councillor').then((m) => m.Councillor),
  },
  {
    path: 'budget',
    title: 'Budget · Mississauga',
    loadComponent: () => import('./features/budget/budget').then((m) => m.Budget),
  },
  {
    path: 'activity',
    title: "What's happening · Mississauga",
    loadComponent: () => import('./features/activity/activity').then((m) => m.Activity),
  },
  { path: '**', redirectTo: '' },
];
