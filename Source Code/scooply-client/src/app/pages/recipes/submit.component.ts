import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, errMsg } from '../../core/api.service';
import { Auth } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { confetti } from '../../core/util';

/** Adding Recipe (contest). Everyone can read the rules; only logged-in members can submit. */
@Component({
  selector: 'app-submit', standalone: true, imports: [FormsModule, RouterLink],
  template: `<div class="page container" style="max-width:860px">
    <div class="title"><h1>Adding Recipe — Recipe Contest</h1></div>
    <div class="card mb" style="display:flex;gap:20px;align-items:flex-start">
      <div class="pro-icon-box md" style="margin:0"><i class="fa-solid fa-trophy"></i></div>
      <div style="flex:1">
        <h4 style="margin:0 0 8px">Contest rules &amp; prizes</h4>
        <ul class="muted" style="margin:0;padding-left:18px">
          <li>Submit your own original ice-cream recipe with a photo.</li>
          <li>Mr. A reviews every entry. Selected recipes win <b>prize money</b> (amount decided by the admin) and a <b>participation certificate</b>.</li>
          <li>Winners are listed on the Home page under <b>Top Recipe</b>.</li>
          <li>Photo: JPG, PNG or WEBP, max 2 MB. You must own the rights to the recipe.</li>
        </ul>
      </div>
    </div>

    @if (!auth.isMember()) { <div class="card center"><h3>Login to participate</h3><p class="muted">Contest entries are for registered members.</p>
      <div class="row" style="justify-content:center"><a class="btn" routerLink="/account/login" [queryParams]="{returnUrl:'/recipes/submit'}">Login</a><a class="btn alt" routerLink="/account/register">Register</a></div></div> }
    @else if (done()) { <div class="card center"><svg class="tick" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/><path d="M28 52l16 16 28-32"/></svg><h3>Recipe submitted!</h3><p class="muted">Track its status in My Submissions.</p>
      <div class="row" style="justify-content:center"><a class="btn" routerLink="/member/submissions">My Submissions</a><button class="btn ghost" (click)="reset()">Submit another</button></div></div> }
    @else { <form class="card" [class.shake]="shake()" (ngSubmit)="submit()" novalidate>
      <div class="field" [class.invalid]="bad('title')"><input id="t" [(ngModel)]="m.recipeTitle" name="t" placeholder=" " maxlength="120"><label for="t">Recipe title</label>@if (bad('title')) { <span class="err">{{bad('title')}}</span> }</div>
      <div class="field" [class.invalid]="bad('desc')"><input id="d" [(ngModel)]="m.description" name="d" placeholder=" " maxlength="300"><label for="d">Short description</label>@if (bad('desc')) { <span class="err">{{bad('desc')}}</span> }</div>
      <div class="field" [class.invalid]="bad('ing')"><textarea id="i" [(ngModel)]="m.ingredients" name="i" placeholder=" "></textarea><label for="i">Ingredients (one per line)</label>@if (bad('ing')) { <span class="err">{{bad('ing')}}</span> }</div>
      <div class="field" [class.invalid]="bad('proc')"><textarea id="p" [(ngModel)]="m.procedure" name="p" placeholder=" "></textarea><label for="p">Procedure (one step per line)</label>@if (bad('proc')) { <span class="err">{{bad('proc')}}</span> }</div>
      <div class="field"><input id="n" [(ngModel)]="m.notes" name="n" placeholder=" " maxlength="190"><label for="n">Notes (optional)</label></div>
      <div class="mb"><label><b>Photo</b></label><br><input type="file" accept="image/jpeg,image/png,image/webp" (change)="pick($event)" aria-label="Recipe photo">
        @if (preview()) { <img [src]="preview()" alt="Preview" style="max-height:160px;border-radius:14px;display:block;margin-top:10px"> }@if (bad('img')) { <span class="err" style="margin:6px 0">{{bad('img')}}</span> }</div>
      <label class="check"><input type="checkbox" [(ngModel)]="m.acceptTerms" name="a"><span>I own this recipe and accept the contest rules.</span></label>@if (bad('terms')) { <span class="err">{{bad('terms')}}</span> }
      <button class="btn" [disabled]="busy()"><i class="fa-solid fa-paper-plane" style="margin-right:6px"></i>@if (busy()) { <span class="spinner"></span> } Submit recipe</button></form> }
  </div>`
})
export class SubmitComponent {
  auth = inject(Auth); private api = inject(Api); private toast = inject(ToastService);
  m: any = { recipeTitle: '', description: '', ingredients: '', procedure: '', notes: '', acceptTerms: false };
  file: File | null = null; preview = signal(''); busy = signal(false); done = signal(false); shake = signal(false); private tried = false;

  bad(k: string) {
    if (!this.tried) return '';
    const m = this.m;
    return ({ title: m.recipeTitle.trim().length < 3 ? 'Title is required (min 3 characters).' : '',
      desc: m.description.trim().length < 10 ? 'Describe your recipe (min 10 characters).' : '',
      ing: m.ingredients.trim().length < 10 ? 'List your ingredients.' : '', proc: m.procedure.trim().length < 20 ? 'Add the steps (min 20 characters).' : '',
      img: !this.file ? 'Please choose a photo.' : '', terms: !m.acceptTerms ? 'You must accept the rules.' : '' } as any)[k];
  }
  pick(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]; this.file = null; this.preview.set('');
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return void this.toast.error('Only JPG, PNG or WEBP images.');
    if (f.size > 2 * 1024 * 1024) return void this.toast.error('Image must be 2 MB or smaller.');
    this.file = f; this.preview.set(URL.createObjectURL(f));
  }
  submit() {
    this.tried = true;
    if (['title', 'desc', 'ing', 'proc', 'img', 'terms'].some(k => this.bad(k))) { this.shake.set(true); setTimeout(() => this.shake.set(false), 500); return; }
    const fd = new FormData();
    fd.append('recipeTitle', this.m.recipeTitle); fd.append('description', this.m.description); fd.append('ingredients', this.m.ingredients);
    fd.append('procedure', this.m.procedure); fd.append('notes', this.m.notes ?? ''); fd.append('acceptTerms', 'true'); fd.append('image', this.file!);
    this.busy.set(true);
    this.api.post('recipes/submit', fd).subscribe({ next: () => { this.busy.set(false); this.done.set(true); confetti(); }, error: e => { this.busy.set(false); this.toast.error(errMsg(e)); } });
  }
  reset() { this.m = { recipeTitle: '', description: '', ingredients: '', procedure: '', notes: '', acceptTerms: false }; this.file = null; this.preview.set(''); this.tried = false; this.done.set(false); }
}
