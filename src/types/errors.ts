export interface ApiError {
  code: string;
  message: string;
  details?: any;
  status?: number;
}
