const { getShops } = require("./tekmetric.controller");
const { Shop } = require("../models");

const syncShops = async () => {
  try {
    let tekmetricShops = await getShops();
    tekmetricShops = tekmetricShops.map((tms) => ({
      ...tms,
      tekmetricId: tms.id,
    }));

    const existingShops = await Shop.find({});

    const existingShopsIds = existingShops.map((s) => s.tekmetricId);

    const shopsToAdd = tekmetricShops
      .filter((tmShop) => !existingShopsIds.includes(tmShop.id))
      .map((tmShop) => ({ ...tmShop, tekmetricId: tmShop.id }));

    if (shopsToAdd.length) {
      await Shop.insertMany(shopsToAdd);
      console.log("New shops added");
    } else {
      console.log("No new shops added");
    }
  } catch (error) {
    throw error
  }
};
syncShops();

const getShopsList = () => {
  return Shop.find({});
};

const getShopById = (shopId) => {
  return Shop.findById(shopId);
};

const updateShop = (shopId, data) =>
  Shop.findByIdAndUpdate(shopId, data, { new: true });

module.exports = {
  updateShop,
  getShopsList,
  getShopById,
};
