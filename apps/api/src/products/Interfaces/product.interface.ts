export interface Products {
  id: number; 
  name: string; 
  price: number; 
  image: string; 
  description?: string; 
  stock?: number;
  isAvailable?: boolean;
}
