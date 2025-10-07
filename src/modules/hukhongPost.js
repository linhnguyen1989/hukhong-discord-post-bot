import {
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  InteractionType,
  EmbedBuilder
} from "discord.js";

/**
 * �ang k� slash command /hukhong_post v� x? l� modal
 * @param {Client} client - Discord client
 * @param {string} allowedRoleId - Role du?c ph�p s? d?ng command
 */
export function registerHukhongPost(client, allowedRoleId) {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      // --- Slash command /hukhong_post ---
      if (interaction.isChatInputCommand() && interaction.commandName === "hukhong_post") {
        if (!interaction.member.roles.cache.has(allowedRoleId)) {
          await interaction.reply({
            content: "? B?n kh�ng c� quy?n s? d?ng bot n�y.",
            ephemeral: true
          });
          return;
        }

        // T?o modal nh?p d? li?u b�i vi?t
        const modal = new ModalBuilder()
          .setCustomId("post_modal")
          .setTitle("T?o b�i vi?t m?i");

        const titleInput = new TextInputBuilder()
          .setCustomId("title_input")
          .setLabel("Ti�u d?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const contentInput = new TextInputBuilder()
          .setCustomId("content_input")
          .setLabel("N?i dung")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const mainImageInput = new TextInputBuilder()
          .setCustomId("main_image_input")
          .setLabel("Link ?nh b�i vi?t (t�y ch?n)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        const headerInput = new TextInputBuilder()
          .setCustomId("header_input")
          .setLabel("Header (t�y ch?n)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        const footerInput = new TextInputBuilder()
          .setCustomId("footer_input")
          .setLabel("Footer (t�y ch?n)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(contentInput),
          new ActionRowBuilder().addComponents(mainImageInput),
          new ActionRowBuilder().addComponents(headerInput),
          new ActionRowBuilder().addComponents(footerInput)
        );

        await interaction.showModal(modal);
      }

      // --- Khi modal du?c g?i ---
      if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "post_modal") {
        const title = interaction.fields.getTextInputValue("title_input");
        const content = interaction.fields.getTextInputValue("content_input");
        const mainImage = interaction.fields.getTextInputValue("main_image_input");
        const header = interaction.fields.getTextInputValue("header_input");
        const footer = interaction.fields.getTextInputValue("footer_input");

        const embed = new EmbedBuilder().setColor(0x00ae86);

        // G?p header, title, content
        let desc = "";
        if (header) desc += `${header}\n\n`;
        desc += `**${title}**\n${content}`;
        embed.setDescription(desc);

        if (mainImage && mainImage.startsWith("http")) embed.setImage(mainImage);
        if (footer) embed.setFooter({ text: footer });

        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply({ content: "? B�i vi?t d� du?c g?i!", ephemeral: true });
        await interaction.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error("? L?i khi x? l� interaction:", err);
      if (interaction && !interaction.replied) {
        await interaction.reply({
          content: "? C� l?i x?y ra khi t?o b�i vi?t.",
          ephemeral: true
        });
      }
    }
  });
}
