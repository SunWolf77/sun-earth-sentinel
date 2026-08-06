declare module "supercluster" {
  export type BBox = [number, number, number, number];
  export type GeoJsonProperties = Record<string, unknown>;

  export type PointFeature<P extends GeoJsonProperties = GeoJsonProperties> = {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: P;
  };

  export type ClusterProperties = {
    cluster: true;
    cluster_id: number;
    point_count: number;
    point_count_abbreviated: string;
  };

  export type ClusterFeature<C extends GeoJsonProperties = GeoJsonProperties> =
    PointFeature<ClusterProperties & C>;

  export type SuperclusterOptions<
    P extends GeoJsonProperties = GeoJsonProperties,
    C extends GeoJsonProperties = GeoJsonProperties,
  > = {
    minZoom?: number;
    maxZoom?: number;
    minPoints?: number;
    radius?: number;
    extent?: number;
    nodeSize?: number;
    log?: boolean;
    generateId?: boolean;
    map?: (props: P) => C;
    reduce?: (accumulated: C, props: C) => void;
  };

  export default class Supercluster<
    P extends GeoJsonProperties = GeoJsonProperties,
    C extends GeoJsonProperties = P,
  > {
    constructor(options?: SuperclusterOptions<P, C>);
    load(points: Array<PointFeature<P>>): this;
    getClusters(
      bbox: BBox,
      zoom: number,
    ): Array<PointFeature<P> | ClusterFeature<C>>;
    getChildren(
      clusterId: number,
    ): Array<PointFeature<P> | ClusterFeature<C>>;
    getLeaves(
      clusterId: number,
      limit?: number,
      offset?: number,
    ): Array<PointFeature<P>>;
    getClusterExpansionZoom(clusterId: number): number;
    getTile(z: number, x: number, y: number): { features: unknown[] } | null;
  }
}
