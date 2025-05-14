  export interface GraphDataset {
    label: string,
    data: Array<number>,
    yAxisID: string
  }
  
  export interface GraphData {
    labels: Array<Array<string>>
    datasets: Array<GraphDataset>
  }
