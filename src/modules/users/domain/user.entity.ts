// Entidade de dominio — sem dependencia de framework ou ORM.
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}
