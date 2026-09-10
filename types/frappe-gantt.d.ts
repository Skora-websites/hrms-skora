declare module "frappe-gantt" {
  export default class Gantt {
    constructor(wrapper: string | SVGSVGElement | HTMLElement, tasks: any[], options?: any);
    change_view_mode(mode: string): void;
  }
}
