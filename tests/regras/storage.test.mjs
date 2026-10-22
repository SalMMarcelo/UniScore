import { describe, it } from "node:test";
import { ref, uploadBytes, getBytes } from "firebase/storage";
import { criarAmbiente, assertSucceeds, assertFails } from "./ambiente.mjs";

const { env, usuario, anonimo } = await criarAmbiente();

const MB = 1024 * 1024;
const enviar = (ctx, caminho, tamanho, contentType) =>
    uploadBytes(ref(ctx.storage(), caminho), new Uint8Array(tamanho), { contentType });

const ana = () => usuario("ana");

describe("avatars", () => {
    it("dono envia imagem", () =>
        assertSucceeds(enviar(ana(), "avatars/ana", 1024, "image/png")));

    it("caminho de outro usuário negado", () =>
        assertFails(enviar(ana(), "avatars/bia", 1024, "image/png")));

    it("arquivo que não é imagem negado", () =>
        assertFails(enviar(ana(), "avatars/ana", 1024, "application/pdf")));

    it("imagem com 5 MB ou mais negada", () =>
        assertFails(enviar(ana(), "avatars/ana", 5 * MB, "image/png")));

    it("leitura pública", async () => {
        await env.withSecurityRulesDisabled((ctx) => enviar(ctx, "avatars/bia", 10, "image/png"));
        await assertSucceeds(getBytes(ref(anonimo().storage(), "avatars/bia")));
    });
});

describe("imagens de avaliações e eventos", () => {
    it("avaliação: imagem até 10 MB no próprio caminho", async () => {
        await assertSucceeds(enviar(ana(), "avaliacoes/ana/foto.jpg", 6 * MB, "image/jpeg"));
        await assertFails(enviar(ana(), "avaliacoes/ana/foto.jpg", 10 * MB, "image/jpeg"));
        await assertFails(enviar(ana(), "avaliacoes/bia/foto.jpg", 1024, "image/jpeg"));
    });

    it("evento: imagem abaixo de 5 MB no próprio caminho", async () => {
        await assertSucceeds(enviar(usuario("uniA"), "eventos/uniA/capa.png", 1024, "image/png"));
        await assertFails(enviar(usuario("uniA"), "eventos/uniA/capa.png", 5 * MB, "image/png"));
        await assertFails(enviar(usuario("uniA"), "eventos/uniB/capa.png", 1024, "image/png"));
    });
});

// Limites alinhados com LIMITES_MIDIA em src/lib/forum.js
describe("mídia do fórum", () => {
    it("imagem de até 10 MB", () =>
        assertSucceeds(enviar(ana(), "forum/ana/a.png", 10 * MB, "image/png")));

    it("imagem acima de 10 MB negada", () =>
        assertFails(enviar(ana(), "forum/ana/a.png", 10 * MB + 1, "image/png")));

    it("vídeo acima de 10 MB e até 50 MB", () =>
        assertSucceeds(enviar(ana(), "forum/ana/v.mp4", 11 * MB, "video/mp4")));

    it("vídeo acima de 50 MB negado", () =>
        assertFails(enviar(ana(), "forum/ana/v.mp4", 50 * MB + 1, "video/mp4")));

    it("outros tipos negados", () =>
        assertFails(enviar(ana(), "forum/ana/doc.pdf", 1024, "application/pdf")));

    it("caminho de outro usuário negado", () =>
        assertFails(enviar(ana(), "forum/bia/a.png", 1024, "image/png")));

    it("anônimo não envia", () =>
        assertFails(enviar(anonimo(), "forum/ana/a.png", 1024, "image/png")));
});
