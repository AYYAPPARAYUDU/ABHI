import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JarvisApiService } from '../../core/services/jarvis-api.service';
import { JarvisAudioService } from '../../core/services/jarvis-audio.service';

export interface ContactItem {
  id?: number;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  created_at?: number;
}

@Component({
  selector: 'app-contacts-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contacts-manager.component.html',
  styleUrls: ['./contacts-manager.component.scss']
})
export class ContactsManagerComponent implements OnInit {
  public contacts: ContactItem[] = [];
  public searchQuery: string = '';
  public isLoading: boolean = false;
  public statusMessage: string = '';

  // New Contact Form
  public newName: string = '';
  public newPhone: string = '';
  public newEmail: string = '';
  public newNotes: string = '';

  constructor(
    private apiService: JarvisApiService,
    private audioService: JarvisAudioService
  ) {}

  ngOnInit(): void {
    this.loadContacts();
  }

  loadContacts(): void {
    this.isLoading = true;
    this.apiService.listContacts().subscribe({
      next: (res) => {
        this.isLoading = false;
        this.contacts = res.contacts || [];
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  get filteredContacts(): ContactItem[] {
    if (!this.searchQuery.trim()) return this.contacts;
    const q = this.searchQuery.toLowerCase();
    return this.contacts.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.toLowerCase().includes(q)) || 
      (c.email && c.email.toLowerCase().includes(q))
    );
  }

  addContact(): void {
    if (!this.newName.trim()) return;
    this.audioService.playSciFiTone('beep');
    this.apiService.saveContact(
      this.newName.trim(),
      this.newPhone.trim() || undefined,
      this.newEmail.trim() || undefined,
      this.newNotes.trim() || undefined
    ).subscribe({
      next: () => {
        this.statusMessage = `Contact '${this.newName}' registered in divine memory!`;
        this.newName = '';
        this.newPhone = '';
        this.newEmail = '';
        this.newNotes = '';
        this.loadContacts();
        setTimeout(() => this.statusMessage = '', 4000);
      }
    });
  }

  deleteContact(name: string): void {
    this.audioService.playSciFiTone('beep');
    this.apiService.deleteContact(name).subscribe({
      next: () => {
        this.statusMessage = `Contact '${name}' removed from memory.`;
        this.loadContacts();
        setTimeout(() => this.statusMessage = '', 3000);
      }
    });
  }

  openWhatsAppForContact(c: ContactItem): void {
    this.audioService.playSciFiTone('ack');
    const recipient = c.phone || c.name;
    this.statusMessage = `Summoning WhatsApp OS control for ${c.name}...`;
    this.apiService.sendWhatsApp(recipient, `Hello ${c.name}!`).subscribe({
      next: (res) => {
        this.statusMessage = `WhatsApp opened for ${c.name}.`;
        setTimeout(() => this.statusMessage = '', 4000);
      },
      error: () => {
        this.statusMessage = `WhatsApp action initiated for ${c.name}.`;
        setTimeout(() => this.statusMessage = '', 4000);
      }
    });
  }
}
