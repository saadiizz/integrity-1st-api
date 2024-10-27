const CronJob = require("cron").CronJob;
const { getCarMDCredits } = require("../controllers/car-md.controller");

// at 12am - midnight pakistan
const job = new CronJob(
  "0 0 * * *",
  async function () {
    const credits = await getCarMDCredits();
    if (credits < 5) {
      const { customerioController } = require("../controllers");
      customerioController.trackAnonymous("carmd_low_credit", { credits });
    }
  },
  null,
  true,
  "Asia/Karachi"
);

job.start();
