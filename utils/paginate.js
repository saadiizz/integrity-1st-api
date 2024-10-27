const _ = require("lodash");
const { PAGINATION_LENGTH } = require("../constants");

module.exports = (items, pageNumber) => {
  const pageSize = PAGINATION_LENGTH;
  const startIndex = (pageNumber - 1) * pageSize;
  return _(items).slice(startIndex).take(pageSize).value();
};
