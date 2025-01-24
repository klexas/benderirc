export class Secrets {
  static get(key: string): string {
    return process.env[key] || '';
  }
}

export default Secrets;