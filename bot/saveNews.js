import axios from "axios";
import chalk from "chalk";
import { sendError } from "./telegram";

export async function saveNews(payload) {
  const d = new Date(payload?.publishedAt);

  const date =
    String(d.getDate()).padStart(2, "0") +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    d.getFullYear();
  return axios
    .post("https://droidtechknow.com/admin/api/stocks/news/save.php", {
      date,
      data: payload
    })
    .then((data) => {
      console.log(chalk.green("Data saved to db"));
      return "success";
    })
    .catch((e) => {
      sendError({
        title: "Error ->>>",
        description: e?.message || e,
        publishedAt: new Date()
      });
      console.log(chalk.red("Error while saving news", e));
      throw e;
    });
}
