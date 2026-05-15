import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { Component, computed, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import dayjs from 'dayjs';

interface RpRecord {
  id: number;
  rp: number;
  created_at: string;
}

type RangeOption = '7d' | '30d' | 'all';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, BaseChartDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly range = signal<RangeOption>('30d');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly records = signal<RpRecord[]>([]);
  readonly darkMode = signal(true);

  readonly stats = computed(() => {
    const rows = this.records();
    if (!rows.length) return null;
    const values = rows.map((x) => x.rp);
    const latest = rows[rows.length - 1]?.rp ?? 0;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { latest, max, min, avg, delta: latest - rows[0].rp };
  });

  readonly chartData = computed<ChartConfiguration<'line'>['data']>(() => ({
    labels: this.records().map((r) => dayjs(r.created_at).format('MM/DD HH:mm')),
    datasets: [{
      data: this.records().map((r) => r.rp),
      borderColor: '#60a5fa',
      backgroundColor: 'rgba(96,165,250,0.2)',
      fill: true,
      tension: 0.25,
      pointRadius: 2
    }]
  }));

  readonly chartOptions = computed<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { ticks: { color: this.darkMode() ? '#cbd5e1' : '#475569' }, grid: { color: 'rgba(148,163,184,0.2)' } },
      y: { ticks: { color: this.darkMode() ? '#cbd5e1' : '#475569' }, grid: { color: 'rgba(148,163,184,0.2)' } }
    },
    plugins: { legend: { display: false } }
  }));

  constructor(private readonly http: HttpClient) {
    this.fetchData();
  }

  fetchData(): void {
    this.loading.set(true);
    this.error.set('');
    let params = new HttpParams().set('range', this.range());
    this.http.get<{ data: RpRecord[] }>('/api/rp', { params }).subscribe({
      next: (res) => {
        this.records.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'データ取得に失敗しました。');
        this.loading.set(false);
      }
    });
  }

  setRange(range: RangeOption): void {
    this.range.set(range);
    this.fetchData();
  }

  exportCsv(): void {
    const header = 'id,rp,created_at';
    const lines = this.records().map((r) => `${r.id},${r.rp},${r.created_at}`);
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rp-${this.range()}-${dayjs().format('YYYYMMDDHHmmss')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  rankLabel(rp: number): string {
    if (rp >= 15000) return 'Apex Predator';
    if (rp >= 10000) return 'Master';
    if (rp >= 8000) return 'Diamond';
    if (rp >= 6000) return 'Platinum';
    if (rp >= 3000) return 'Gold';
    if (rp >= 1000) return 'Silver';
    return 'Bronze';
  }
}
