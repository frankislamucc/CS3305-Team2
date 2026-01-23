export interface Point {
        x: number;
        y: number;
}

export interface LineData {
        id: string;
        points: Point[];
        stroke: string;
        strokeWidth: number;
        tension: number;
        lineCap: string;
        lineJoin: string;
}
