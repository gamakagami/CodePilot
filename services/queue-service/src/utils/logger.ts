export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: any) {
    console.log(`[${this.context}] ℹ️  ${message}`, data || '');
  }

  success(message: string, data?: any) {
    console.log(`[${this.context}] ✅ ${message}`, data || '');
  }

  error(message: string, error?: any) {
    console.error(`[${this.context}] ❌ ${message}`, error || '');
  }

  warn(message: string, data?: any) {
    console.warn(`[${this.context}] ⚠️  ${message}`, data || '');
  }

  processing(message: string, data?: any) {
    console.log(`[${this.context}] 🔄 ${message}`, data || '');
  }
}