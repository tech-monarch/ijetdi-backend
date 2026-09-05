import { Router } from "express";
import { okPaginated } from "../../lib/envelope.js";
import { camelQuery } from "../../middleware/caseConversion.js";
import { searchQuerySchema } from "./search.schemas.js";
import * as searchService from "./search.service.js";

export const searchRouter = Router();

// GET /api/search — Public.
searchRouter.get("/search", async (req, res, next) => {
  try {
    const query = searchQuerySchema.parse(camelQuery(req));
    const { data, pagination } = await searchService.search(query);
    okPaginated(res, data, pagination);
  } catch (err) {
    next(err);
  }
});
