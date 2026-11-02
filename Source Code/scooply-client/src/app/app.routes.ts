import { Routes } from '@angular/router';
import { adminGuard, memberGuard } from './core/auth.service';

/** Route table. Angular paths mirror the SRS URLs in lowercase (e.g. /recipes/free, /account/login). */
export const routes: Routes = [
  { path: '', title: 'Scooply', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'account/login', title: 'Login', loadComponent: () => import('./pages/account/login.component').then(m => m.LoginComponent) },
  { path: 'account/register', title: 'Join Scooply', loadComponent: () => import('./pages/account/register.component').then(m => m.RegisterComponent) },
  { path: 'account/forgot-password', title: 'Forgot password', loadComponent: () => import('./pages/account/forgot.component').then(m => m.ForgotComponent) },
  { path: 'account/reset-password', title: 'Reset password', loadComponent: () => import('./pages/account/forgot.component').then(m => m.ResetComponent) },
  { path: 'recipes', title: 'Recipes', loadComponent: () => import('./pages/recipes/recipes.component').then(m => m.RecipesComponent) },
  { path: 'recipes/free', title: 'Free Recipe Available', loadComponent: () => import('./pages/recipes/free.component').then(m => m.FreeComponent) },
  { path: 'recipes/most-famous', title: 'Most Famous Flavors', canActivate: [memberGuard], loadComponent: () => import('./pages/recipes/famous.component').then(m => m.FamousComponent) },
  { path: 'recipes/submit', title: 'Adding Recipe', loadComponent: () => import('./pages/recipes/submit.component').then(m => m.SubmitComponent) },
  { path: 'recipes/:id', title: 'Recipe', loadComponent: () => import('./pages/recipes/recipe-detail.component').then(m => m.RecipeDetailComponent) },
  { path: 'books', title: 'Order the Books of the Recipe', loadComponent: () => import('./pages/books/books.component').then(m => m.BooksComponent) },
  { path: 'books/track', title: 'Track Order', loadComponent: () => import('./pages/books/track.component').then(m => m.TrackComponent) },
  { path: 'books/order/:id', title: 'Order a book', loadComponent: () => import('./pages/books/order.component').then(m => m.OrderComponent) },
  { path: 'feedback', title: 'Feedback', loadComponent: () => import('./pages/info/feedback.component').then(m => m.FeedbackComponent) },
  { path: 'about', title: 'About Us', loadComponent: () => import('./pages/info/about.component').then(m => m.AboutComponent) },
  { path: 'contact', title: 'Contact Us', loadComponent: () => import('./pages/info/contact.component').then(m => m.ContactComponent) },
  { path: 'faq', title: "FAQ's", loadComponent: () => import('./pages/info/faq.component').then(m => m.FaqComponent) },
  { path: 'member/dashboard', title: 'My Dashboard', canActivate: [memberGuard], loadComponent: () => import('./pages/member/member.components').then(m => m.MemberDashboardComponent) },
  { path: 'member/orders', title: 'My Orders', canActivate: [memberGuard], loadComponent: () => import('./pages/member/member.components').then(m => m.MemberOrdersComponent) },
  { path: 'member/submissions', title: 'My Submissions', canActivate: [memberGuard], loadComponent: () => import('./pages/member/member.components').then(m => m.MemberSubmissionsComponent) },
  { path: 'admin/login', title: 'Admin Login', loadComponent: () => import('./admin/admin-shell.components').then(m => m.AdminLoginComponent) },
  { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./admin/admin-shell.components').then(m => m.AdminLayoutComponent), children: [
    { path: '', title: 'Admin Dashboard', loadComponent: () => import('./admin/admin-shell.components').then(m => m.AdminDashboardComponent) },
    { path: 'flavors', title: 'Recipes', loadComponent: () => import('./admin/admin-flavors.component').then(m => m.AdminFlavorsComponent) },
    { path: 'members', title: 'Members', loadComponent: () => import('./admin/admin-sales.components').then(m => m.AdminMembersComponent) },
    { path: 'payments', title: 'Payments', loadComponent: () => import('./admin/admin-sales.components').then(m => m.AdminPaymentsComponent) },
    { path: 'orders', title: 'Book Orders', loadComponent: () => import('./admin/admin-sales.components').then(m => m.AdminOrdersComponent) },
    { path: 'books', title: 'Books', loadComponent: () => import('./admin/admin-sales.components').then(m => m.AdminBooksComponent) },
    { path: 'feedback', title: 'Feedback', loadComponent: () => import('./admin/admin-community.components').then(m => m.AdminFeedbackComponent) },
    { path: 'messages', title: 'Contact Messages', loadComponent: () => import('./admin/admin-community.components').then(m => m.AdminMessagesComponent) },
    { path: 'submissions', title: 'Recipe Submissions', loadComponent: () => import('./admin/admin-community.components').then(m => m.AdminSubmissionsComponent) },
    { path: 'settings', title: 'Settings', loadComponent: () => import('./admin/admin-settings.component').then(m => m.AdminSettingsComponent) }
  ] },
  { path: '**', title: 'Not found', loadComponent: () => import('./pages/info/not-found.component').then(m => m.NotFoundComponent) }
];
