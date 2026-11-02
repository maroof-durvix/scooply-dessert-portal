import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { CustomSelectComponent } from '../shared/custom-select.component';

/** Plans pricing, FAQs, branches, site/About/Contact text, admin password and activity log. */
@Component({
  selector: 'app-admin-settings', standalone: true, imports: [FormsModule, DatePipe, CustomSelectComponent],
  template: `<h2>Settings</h2><div class="row mb">@for (t of tabs; track t) { <button class="btn sm" [class.ghost]="tab() !== t" (click)="tab.set(t)">{{t}}</button> }</div>
    @switch (tab()) {
      @case ('Plans') { @for (p of plans(); track p.planId) { <div class="card mb row"><input [(ngModel)]="p.name" style="width:130px" aria-label="Name"><input type="number" step="0.01" [(ngModel)]="p.price" style="width:110px" aria-label="Price"><input type="number" [(ngModel)]="p.durationDays" style="width:90px" aria-label="Days">
        <label class="check" style="margin:0"><input type="checkbox" [(ngModel)]="p.isActive"><span>Active</span></label><button class="btn sm" (click)="savePlan(p)">Save</button></div> } }
      @case ('FAQs') { <button class="btn sm mb" (click)="addFaq()">+ Add FAQ</button>
        @for (f of faqs(); track $index) { <div class="card mb"><div class="row"><app-custom-select [(ngModel)]="f.category" [options]="cats"/><input type="number" [(ngModel)]="f.displayOrder" style="width:80px" aria-label="Order"><label class="check" style="margin:0"><input type="checkbox" [(ngModel)]="f.isActive"><span>Active</span></label></div>
          <input [(ngModel)]="f.question" placeholder="Question" style="width:100%;margin:8px 0"><textarea [(ngModel)]="f.answer" placeholder="Answer" style="width:100%"></textarea>
          <div class="row mt"><button class="btn sm" (click)="saveFaq(f)">Save</button>@if (f.faqId) { <button class="btn sm danger" (click)="delFaq(f)">Delete</button> }</div></div> } }
      @case ('Branches') { <button class="btn sm mb" (click)="addBranch()">+ Add branch</button>
        @for (b of branches(); track $index) { <div class="card mb grid g3"><input [(ngModel)]="b.name" placeholder="Name"><input [(ngModel)]="b.address" placeholder="Address"><input [(ngModel)]="b.phone" placeholder="Phone"><input [(ngModel)]="b.mapEmbedUrl" placeholder="Map link (optional)">
          <div class="row"><button class="btn sm" (click)="saveBranch(b)">Save</button>@if (b.branchId) { <button class="btn sm danger" (click)="delBranch(b)">Delete</button> }</div></div> } }
      @case ('Site / About') { @if (site(); as s) { <form class="card" (ngSubmit)="saveSite()"><div class="grid g2"><input [(ngModel)]="s.shopName" name="a" placeholder="Shop name"><input [(ngModel)]="s.ownerName" name="b" placeholder="Owner"><input [(ngModel)]="s.phone" name="c" placeholder="Phone"><input [(ngModel)]="s.email" name="d" placeholder="Email"><input [(ngModel)]="s.address" name="e" placeholder="Address"><input [(ngModel)]="s.workingHours" name="f" placeholder="Working hours"></div>
        <textarea [(ngModel)]="s.aboutText" name="g" placeholder="About text" style="width:100%;min-height:120px;margin-top:12px"></textarea><input [(ngModel)]="s.ownerQuote" name="h" placeholder="Owner quote" style="width:100%;margin:12px 0"><button class="btn">Save site settings</button></form> } }
      @case ('Password') { <form class="card" style="max-width:420px" (ngSubmit)="savePw()"><div class="field"><input id="c" type="password" [(ngModel)]="pw.cur" name="c" placeholder=" "><label for="c">Current password</label></div><div class="field"><input id="n" type="password" [(ngModel)]="pw.new" name="n" placeholder=" "><label for="n">New password</label></div><button class="btn">Change password</button></form> }
      @case ('Activity log') { <div class="table-wrap"><table><thead><tr><th>When</th><th>Action</th></tr></thead><tbody>@for (a of log(); track a.id) { <tr><td>{{a.at | date:'medium'}}</td><td>{{a.action}}</td></tr> }</tbody></table></div> }
    }`
})
export class AdminSettingsComponent implements OnInit {
  private api = inject(Api); private toast = inject(ToastService);
  tabs = ['Plans', 'FAQs', 'Branches', 'Site / About', 'Password', 'Activity log']; cats = ['Membership', 'Recipes', 'Books', 'Payments', 'Contest']; tab = signal('Plans');
  plans = signal<any[]>([]); faqs = signal<any[]>([]); branches = signal<any[]>([]); site = signal<any>(null); log = signal<any[]>([]); pw = { cur: '', new: '' };
  ngOnInit() { this.api.get('admin/plans').subscribe(r => this.plans.set(r)); this.loadFaqs(); this.loadBranches(); this.api.get('admin/site').subscribe(r => this.site.set(r)); this.api.get('admin/activity').subscribe(r => this.log.set(r)); }
  private ok = (m: string) => ({ next: () => this.toast.success(m), error: (e: any) => this.toast.error(errMsg(e)) });
  savePlan(p: any) { this.api.put('admin/plans/' + p.planId, p).subscribe(this.ok('Plan saved')); }
  addFaq() { this.faqs.update(f => [...f, { faqId: 0, category: 'Membership', question: '', answer: '', displayOrder: f.length + 1, isActive: true }]); }
  addBranch() { this.branches.update(b => [...b, { branchId: 0, name: '', address: '', phone: '', mapEmbedUrl: '' }]); }
  loadFaqs() { this.api.get('admin/faqs').subscribe(r => this.faqs.set(r)); }
  saveFaq(f: any) { (f.faqId ? this.api.put('admin/faqs/' + f.faqId, f) : this.api.post('admin/faqs', f)).subscribe({ next: () => { this.toast.success('FAQ saved'); this.loadFaqs(); }, error: e => this.toast.error(errMsg(e)) }); }
  delFaq(f: any) { this.api.delete('admin/faqs/' + f.faqId).subscribe(() => { this.toast.success('FAQ deleted'); this.loadFaqs(); }); }
  loadBranches() { this.api.get('admin/branches').subscribe(r => this.branches.set(r)); }
  saveBranch(b: any) { (b.branchId ? this.api.put('admin/branches/' + b.branchId, b) : this.api.post('admin/branches', b)).subscribe({ next: () => { this.toast.success('Branch saved'); this.loadBranches(); }, error: e => this.toast.error(errMsg(e)) }); }
  delBranch(b: any) { this.api.delete('admin/branches/' + b.branchId).subscribe(() => { this.toast.success('Branch deleted'); this.loadBranches(); }); }
  saveSite() { this.api.put('admin/site', this.site()).subscribe(this.ok('Settings saved')); }
  savePw() { this.api.post('admin/change-password', { currentPassword: this.pw.cur, newPassword: this.pw.new }).subscribe({ next: () => { this.toast.success('Password changed'); this.pw = { cur: '', new: '' }; }, error: e => this.toast.error(errMsg(e)) }); }
}
