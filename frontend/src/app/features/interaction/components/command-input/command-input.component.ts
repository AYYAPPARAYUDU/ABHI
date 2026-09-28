import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InteractionService } from '../../services/interaction.service';

@Component({
  selector: 'app-command-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './command-input.component.html',
  styleUrls: ['./command-input.component.css']
})
export class CommandInputComponent {
  private readonly interactionService = inject(InteractionService);

  commandText = signal<string>('');
  selectedLanguage = signal<string>('auto');

  readonly multilingualExamples = [
    { label: 'English: Open Calculator', text: 'Open calculator', lang: 'en' },
    { label: 'Telugu: టెస్ట్ అప్లికేషన్ ఓపెన్ చేయి', text: 'టెస్ట్ అప్లికేషన్ ఓపెన్ చేయి', lang: 'te' },
    { label: 'Hindi: टेस्ट एप्लिकेशन खोलो', text: 'टेस्ट एप्लिकेशन खोलो', lang: 'hi' },
    { label: 'Tamil: டெஸ்ட் அப்ளிகேஷனை திற', text: 'டெஸ்ட் அப்ளிகேஷனை திற', lang: 'ta' },
    { label: 'Mixed: Find system status report', text: 'Find system status report', lang: 'en' }
  ];

  onTextChange(value: string): void {
    this.commandText.set(value);
  }

  selectExample(text: string, lang: string): void {
    this.commandText.set(text);
    this.selectedLanguage.set(lang);
    this.submit();
  }

  submit(): void {
    const text = this.commandText().trim();
    if (!text) return;
    this.interactionService.submitTextCommand(text, this.selectedLanguage());
  }

  clear(): void {
    this.commandText.set('');
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    } else if (event.key === 'Escape') {
      this.clear();
    }
  }
}
