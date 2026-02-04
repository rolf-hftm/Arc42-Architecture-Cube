import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ArchitectureSpaceComponent } from './architecture-space/architecture-space.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ArchitectureSpaceComponent],
  template: '<app-architecture-space></app-architecture-space>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
