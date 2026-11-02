import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { PagerComponent } from './pager.component';

/** Recipe management: flavors + recipes CRUD with image upload and dynamic ingredient/step editors. */
@Component({
  selector: 'app-admin-flavors', standalone: true, imports: [FormsModule, PagerComponent],
  template: `<div class="row between mb"><h2 style="margin:0">Recipe Management</h2><button class="btn" (click)="edit(0)">+ Add flavor</button></div>
    <div class="row mb"><div class="search-box" style="min-width:320px"><i class="fa-solid fa-magnifying-glass search-icon" aria-hidden="true"></i><input aria-label="Search" [(ngModel)]="search" (ngModelChange)="page = 1; load()" placeholder="Search flavors..."></div></div>
    <div class="table-wrap"><table><thead><tr><th>Image</th><th>Name</th><th>Free</th><th>Famous</th><th>Status</th><th></th></tr></thead><tbody>
      @for (f of items(); track f.flavorId) { <tr><td><img [src]="api.img(f.imagePath)" alt="" style="width:50px;height:50px;object-fit:cover;border-radius:10px;background:#fff"></td><td>{{f.name}}</td>
        <td>@if (f.isFree) { <i class="fa-solid fa-circle-check" style="color:var(--mint);font-size:1.1rem"></i> }</td><td>@if (f.isMostFamous) { <i class="fa-solid fa-crown" style="color:var(--primary);font-size:1.1rem"></i> }</td><td><span class="badge" [class]="'badge ' + (f.isActive ? 'Completed' : 'Failed')">{{f.isActive ? 'Active' : 'Inactive'}}</span></td>
        <td class="row"><button class="btn sm ghost" (click)="edit(f.flavorId)"><i class="fa-solid fa-pen-to-square"></i> Edit</button>@if (f.isActive) { <button class="btn sm danger" (click)="remove(f)"><i class="fa-solid fa-ban"></i> Deactivate</button> }</td></tr> }</tbody></table></div>
    <app-pager [page]="page" [total]="total()" [pageSize]="10" (pageChange)="page = $event; load()"/>

    @if (m()) { <div class="modal-bg" (click)="m.set(null)"><form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="save()"><h3>{{m().id ? 'Edit' : 'Add'}} flavor</h3>
      <div class="field"><input id="n" [(ngModel)]="m().name" name="n" placeholder=" " required><label for="n">Name</label></div>
      <div class="field"><input id="d" [(ngModel)]="m().shortDescription" name="d" placeholder=" " required><label for="d">Short description</label></div>
      <div class="row"><label class="check"><input type="checkbox" [(ngModel)]="m().isFree" name="f"><span>Free recipe</span></label><label class="check"><input type="checkbox" [(ngModel)]="m().isMostFamous" name="mf"><span>Most famous</span></label><label class="check"><input type="checkbox" [(ngModel)]="m().isActive" name="a"><span>Active</span></label></div>
      <div class="grid g2"><div class="field"><input id="pt" type="number" [(ngModel)]="m().prep" name="pt" placeholder=" " min="1"><label for="pt">Prep minutes</label></div><div class="field"><input id="sv" type="number" [(ngModel)]="m().servings" name="sv" placeholder=" " min="1"><label for="sv">Servings</label></div></div>
      <h4>Ingredients</h4>@for (r of m().ing; track $index; let i = $index) { <div class="row mb"><input [(ngModel)]="m().ing[i]" [name]="'i' + i" style="flex:1;padding:8px;border-radius:10px;border:2px solid var(--border);background:var(--card);color:var(--text)"><button type="button" class="btn sm danger" (click)="m().ing.splice(i, 1)"><i class="fa-solid fa-trash-can"></i></button></div> }
      <button type="button" class="btn sm ghost mb" (click)="m().ing.push('')"><i class="fa-solid fa-plus"></i> Ingredient</button>
      <h4>Procedure steps</h4>@for (r of m().steps; track $index; let i = $index) { <div class="row mb"><span>{{i + 1}}.</span><input [(ngModel)]="m().steps[i]" [name]="'s' + i" style="flex:1;padding:8px;border-radius:10px;border:2px solid var(--border);background:var(--card);color:var(--text)">
        <button type="button" class="btn sm ghost" [disabled]="i === 0" (click)="move(i, -1)"><i class="fa-solid fa-arrow-up"></i></button><button type="button" class="btn sm ghost" [disabled]="i === m().steps.length - 1" (click)="move(i, 1)"><i class="fa-solid fa-arrow-down"></i></button><button type="button" class="btn sm danger" (click)="m().steps.splice(i, 1)"><i class="fa-solid fa-trash-can"></i></button></div> }
      <button type="button" class="btn sm ghost mb" (click)="m().steps.push('')"><i class="fa-solid fa-plus"></i> Step</button>
      <div class="mb"><b>Image</b> {{m().id ? '(leave empty to keep current)' : ''}}<br><input type="file" accept="image/jpeg,image/png,image/webp" (change)="pick($event)">@if (m().preview) { <img [src]="m().preview" alt="" style="height:90px;display:block;margin-top:8px;border-radius:10px"> }</div>
      <div class="row"><button class="btn" [disabled]="busy()">@if (busy()) { <span class="spinner"></span> } Save</button><button type="button" class="btn ghost" (click)="m.set(null)">Cancel</button></div></form></div> }`
})
export class AdminFlavorsComponent implements OnInit {
  api = inject(Api); private toast = inject(ToastService);
  items = signal<any[]>([]); total = signal(0); page = 1; search = ''; m = signal<any>(null); busy = signal(false); file: File | null = null;
  ngOnInit() { this.load(); }
  load() { this.api.get('admin/flavors', { search: this.search, page: this.page, pageSize: 10 }).subscribe(r => { this.items.set(r.items); this.total.set(r.total); }); }
  edit(id: number) {
    this.file = null;
    if (!id) return this.m.set({ id: 0, name: '', shortDescription: '', isFree: false, isMostFamous: false, isActive: true, prep: 30, servings: 6, ing: [''], steps: [''], preview: '' });
    this.api.get('admin/flavors/' + id).subscribe(f => this.m.set({ id: f.flavorId, name: f.name, shortDescription: f.shortDescription, isFree: f.isFree, isMostFamous: f.isMostFamous, isActive: f.isActive,
      prep: f.prepTimeMinutes, servings: f.servings, ing: f.ingredients.split('\n').filter((x: string) => x), steps: f.procedure.split('\n').filter((x: string) => x), preview: this.api.img(f.imagePath) }));
  }
  move(i: number, d: number) { const s = this.m().steps; [s[i], s[i + d]] = [s[i + d], s[i]]; }
  pick(e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return; if (f.size > 2 * 1024 * 1024) return void this.toast.error('Image must be 2 MB or smaller.'); this.file = f; this.m().preview = URL.createObjectURL(f); }
  save() {
    const m = this.m(), ing = m.ing.map((x: string) => x.trim()).filter((x: string) => x), steps = m.steps.map((x: string) => x.trim()).filter((x: string) => x);
    if (!ing.length || !steps.length) return void this.toast.error('Add at least one ingredient and one step.');
    if (!m.id && !this.file) return void this.toast.error('Please upload an image.');
    const fd = new FormData();
    fd.append('name', m.name); fd.append('shortDescription', m.shortDescription); fd.append('isFree', String(m.isFree)); fd.append('isMostFamous', String(m.isMostFamous)); fd.append('isActive', String(m.isActive));
    fd.append('ingredients', ing.join('\n')); fd.append('procedure', steps.join('\n')); fd.append('prepTimeMinutes', String(m.prep)); fd.append('servings', String(m.servings)); if (this.file) fd.append('image', this.file);
    this.busy.set(true);
    (m.id ? this.api.put('admin/flavors/' + m.id, fd) : this.api.post('admin/flavors', fd)).subscribe({ next: (r: any) => { this.busy.set(false); this.toast.success(r.message); this.m.set(null); this.load(); }, error: e => { this.busy.set(false); this.toast.error(errMsg(e)); } });
  }
  remove(f: any) { if (confirm(`Deactivate ${f.name}?`)) this.api.delete('admin/flavors/' + f.flavorId).subscribe({ next: (r: any) => { this.toast.success(r.message); this.load(); }, error: e => this.toast.error(errMsg(e)) }); }
}
