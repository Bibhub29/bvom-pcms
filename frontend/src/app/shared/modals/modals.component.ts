
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modals',
  imports: [],
  templateUrl: './modals.component.html',
  styleUrl: './modals.component.css'
})
export class ModalsComponent {
  @Input() visible = false;
  @Input() title = 'Modal Title';
  @Input() description = 'Add your information below.';
  @Input() icon = '✦';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() theme: 'purple' | 'blue' | 'green' | 'orange' | 'red' = 'purple';
  @Input() confirmText = 'Save Changes';
  @Input() cancelText = 'Cancel';
  @Input() showFooter = true;
  @Input() showCancel = true;
  @Input() showConfirm = true;
  @Input() loading = false;
  @Input() disabled = false;

  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  closeModal() {
    if (this.loading) {
      return;
    }

    this.closed.emit();
  }

  cancelModal() {
    if (this.loading) {
      return;
    }

    this.cancelled.emit();
    this.closed.emit();
  }

  confirmModal() {
    if (this.loading || this.disabled) {
      return;
    }

    this.confirmed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.visible && !this.loading) {
      this.closeModal();
    }
  }
}
