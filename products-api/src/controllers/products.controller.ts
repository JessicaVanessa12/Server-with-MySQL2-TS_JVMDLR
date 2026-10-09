import { Request, Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../conf/dbConnection.js";

interface Product extends RowDataPacket {
  id: number;
  name: string;
  price: string;
  stock: number;
  description: string;
  brand: string | null;
  img: string | null;
  active: boolean;
}

interface ProductInput {
  name: string;
  price: number;
  stock: number;
  description: string;
  brand: string | null;
  img: string | null;
}

const MAX_PRICE = 99999999.99; // DECIMAL(10,2)

const parseId = (raw: string): number | null => {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const isValidPrice = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value > 0 &&
  value <= MAX_PRICE &&
  Math.round(value * 100) / 100 === value;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isOptionalString = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === "string";

const validateProductBody = (
  body: Record<string, unknown> | undefined
): { data?: ProductInput; errors: string[] } => {
  const errors: string[] = [];
  const b = body ?? {};

  if (!isNonEmptyString(b.name)) errors.push("name is required");
  if (!isValidPrice(b.price))
    errors.push("price must be a number greater than 0 with at most 2 decimals");
  if (!Number.isInteger(b.stock) || (b.stock as number) < 0)
    errors.push("stock must be an integer greater than or equal to 0");
  if (!isNonEmptyString(b.description)) errors.push("description is required");
  if (!isOptionalString(b.brand)) errors.push("brand must be a string");
  if (!isOptionalString(b.img)) errors.push("img must be a string");

  if (errors.length > 0) return { errors };

  return {
    errors,
    data: {
      name: (b.name as string).trim(),
      price: b.price as number,
      stock: b.stock as number,
      description: (b.description as string).trim(),
      brand: (b.brand as string | null | undefined) ?? null,
      img: (b.img as string | null | undefined) ?? null,
    },
  };
};

const findActiveById = async (id: number): Promise<Product | null> => {
  const [rows] = await pool.query<Product[]>(
    "SELECT * FROM products WHERE id = ? AND active = TRUE",
    [id]
  );
  return rows[0] ?? null;
};

const serverError = (res: Response, error: unknown): void => {
  console.error(error); // full detail only in the server logs
  res.status(500).json({ message: "Internal server error" });
};

export const getAll = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<Product[]>(
      "SELECT * FROM products WHERE active = TRUE"
    );
    res.status(200).json(rows);
  } catch (error) {
    console.log("=== ERROR EXACTO DE MYSQL ===");
    console.log(error);
    console.log("=============================");
    serverError(res, error);
  }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id as string);
  if (id === null) {
    res.status(400).json({ message: "id must be a positive integer" });
    return;
  }
  try {
    const product = await findActiveById(id);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    res.status(200).json(product);
  } catch (error) {
    serverError(res, error);
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const { data, errors } = validateProductBody(req.body);
  if (!data) {
    res.status(400).json({ message: "Invalid data", errors });
    return;
  }
  try {
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO products (name, price, stock, description, brand, img) VALUES (?, ?, ?, ?, ?, ?)",
      [data.name, data.price, data.stock, data.description, data.brand, data.img]
    );
    res.status(201).json(await findActiveById(result.insertId));
  } catch (error) {
    serverError(res, error);
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id as string);
  if (id === null) {
    res.status(400).json({ message: "id must be a positive integer" });
    return;
  }
  const { data, errors } = validateProductBody(req.body);
  if (!data) {
    res.status(400).json({ message: "Invalid data", errors });
    return;
  }
  try {
    if (!(await findActiveById(id))) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    await pool.query(
      "UPDATE products SET name = ?, price = ?, stock = ?, description = ?, brand = ?, img = ? WHERE id = ? AND active = TRUE",
      [data.name, data.price, data.stock, data.description, data.brand, data.img, id]
    );
    res.status(200).json(await findActiveById(id));
  } catch (error) {
    serverError(res, error);
  }
};

// Logical delete: active = FALSE (no DELETE statement)
export const remove = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id as string);
  if (id === null) {
    res.status(400).json({ message: "id must be a positive integer" });
    return;
  }
  try {
    if (!(await findActiveById(id))) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    await pool.query("UPDATE products SET active = FALSE WHERE id = ?", [id]);
    res.status(200).json({ message: "Product deactivated successfully" });
  } catch (error) {
    serverError(res, error);
  }
};

export const changePrice = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id as string);
  if (id === null) {
    res.status(400).json({ message: "id must be a positive integer" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "price" || !isValidPrice(body.price)) {
    res.status(400).json({
      message: "Body must contain only price, a number greater than 0 with at most 2 decimals",
    });
    return;
  }
  try {
    if (!(await findActiveById(id))) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    await pool.query("UPDATE products SET price = ? WHERE id = ? AND active = TRUE", [
      body.price,
      id,
    ]);
    res.status(200).json(await findActiveById(id));
  } catch (error) {
    serverError(res, error);
  }

  
};
