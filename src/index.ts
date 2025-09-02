import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`🤖 Bot đã đăng nhập với tên: ${client.user?.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "post") {
    // Kiểm tra quyền (Admin mới được dùng)
    if (!interaction.memberPermissions?.has("Administrator")) {
      await interaction.reply({
        content: "❌ Bạn không có quyền dùng lệnh này!",
        ephemeral: true,
      });
      return;
    }

    const title = interaction.options.getString("title", true);
    const content = interaction.options.getString("content", true);
    const image = interaction.options.getString("image") ?? null;
    const footer = interaction.options.getString("footer") ?? null;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(content)
      .setColor(0x00ae86);

    if (image) embed.setImage(image);
    if (footer) embed.setFooter({ text: footer });

    await interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);