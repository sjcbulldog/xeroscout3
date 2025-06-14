
export class XeroPoint {
    public readonly x: number;
    public readonly y: number;

    constructor(public xv: number, public yv: number) {
        this.x = xv;
        this.y = yv;
    }

    public toString(): string { 
        return `XeroPoint(${this.x}, ${this.y})`;
    }

    public clone(): XeroPoint {
        return new XeroPoint(this.x, this.y);
    }

    public add(p: XeroPoint): XeroPoint {
        return new XeroPoint(this.x + p.x, this.y + p.y);
    }

    public subtract(p: XeroPoint): XeroPoint {
        return new XeroPoint(this.x - p.x, this.y - p.y);
    }

    public distance(p: XeroPoint): number {
        return Math.sqrt((this.x - p.x) ** 2 + (this.y - p.y) ** 2);
    }

    public static fromDOMPoint(point: DOMPoint): XeroPoint { 
        return new XeroPoint(point.x, point.y);
    }
}

export class XeroSize {
    public readonly width: number;
    public readonly height: number;
    public static readonly zero = new XeroSize(0, 0);

    constructor(public wid: number, public hei: number) {
        this.width = wid;
        this.height = hei;
    }

    public toString(): string {
        return `XeroSize(${this.width}, ${this.height})`;
    }

    public clone(): XeroSize {
        return new XeroSize(this.width, this.height);
    }
}

export class XeroRect {
    public readonly x: number;
    public readonly y: number;
    public readonly width: number;
    public readonly height: number;
    public static zero = new XeroRect(0, 0, 0, 0);

    constructor(public xv: number, public yv: number, public wv: number, public hv: number) {
        this.x = xv;
        this.y = yv;
        this.width = wv;
        this.height = hv;
    }
    
    public offset(sz: XeroSize) : XeroRect {
        return new XeroRect(this.x + sz.width, this.y + sz.height, this.width, this.height);
    }

    public get left(): number {
        return this.x;
    }

    public get right(): number {
        return this.x + this.width;
    }

    public get top(): number {
        return this.y;
    }

    public get bottom(): number {
        return this.y + this.height;
    }

    public clone(): XeroRect {
        return new XeroRect(this.x, this.y, this.width, this.height);
    }

    public contains(p: XeroPoint): boolean {
        return p.x >= this.x && p.x <= this.x + this.width && p.y >= this.y && p.y <= this.y + this.height;
    }

    public intersects(r: XeroRect): boolean {
        return this.x < r.x + r.width && this.x + this.width > r.x && this.y < r.y + r.height && this.y + this.height > r.y;
    }

    public intersection(r: XeroRect): XeroRect | undefined {
        if (this.intersects(r)) {
            const x = Math.max(this.x, r.x);
            const y = Math.max(this.y, r.y);
            const w = Math.min(this.x + this.width, r.x + r.width) - x;
            const h = Math.min(this.y + this.height, r.y + r.height) - y;
            return new XeroRect(x, y, w, h);
        }
        return undefined;
    }

    public union(r: XeroRect): XeroRect {
        const x = Math.min(this.x, r.x);
        const y = Math.min(this.y, r.y);
        const w = Math.max(this.x + this.width, r.x + r.width) - x;
        const h = Math.max(this.y + this.height, r.y + r.height) - y;
        return new XeroRect(x, y, w, h);
    }

    public toString(): string {
        return `XeroRect((${this.x}, ${this.y}) ${this.width}x${this.height})`;
    }

    public upperLeft(): XeroPoint {
        return new XeroPoint(this.x, this.y);

    }

    public upperRight(): XeroPoint {
        return new XeroPoint(this.x + this.width, this.y);
    }

    public lowerLeft(): XeroPoint {
        return new XeroPoint(this.x, this.y + this.height);
    }

    public lowerRight(): XeroPoint {
        return new XeroPoint(this.x + this.width, this.y + this.height);
    }

    public center(): XeroPoint {
        return new XeroPoint(this.x + this.width / 2, this.y + this.height / 2);
    }

    public static fromDOMRect(rect: DOMRect): XeroRect {
        return new XeroRect(rect.x, rect.y, rect.width, rect.height);
    }

    public static fromPoints(points: XeroPoint[]): XeroRect {
        if (points.length !== 2) {
            throw new Error('XeroRect.fromPoints requires exactly 2 points');
        }
        
        let minX = points[0].x;
        let minY = points[0].y;
        let maxX = points[0].x;
        let maxY = points[0].y;
        for (const point of points) {
            if (point.x < minX) {
                minX = point.x;
            }
            if (point.y < minY) {
                minY = point.y;
            }
            if (point.x > maxX) {
                maxX = point.x;
            }
            if (point.y > maxY) {
                maxY = point.y;
            }
        }
        return new XeroRect(minX, minY, maxX - minX, maxY - minY);
    }

    public static fromPointSize(point: XeroPoint, size: XeroSize): XeroRect {   
        return new XeroRect(point.x, point.y, size.width, size.height);
    }
}