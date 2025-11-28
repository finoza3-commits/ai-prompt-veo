// sidepanel.js
// ทำงานทั้งบน localhost และ Render (ไม่มี chrome.* ใช้ได้บนเว็บปกติ)

document.addEventListener("DOMContentLoaded", () => {
  const modeEl = document.getElementById("mode");
  const actorPresetEl = document.getElementById("actorPreset");
  const scenePresetEl = document.getElementById("scenePreset");
  const flowPresetEl = document.getElementById("flowPreset");
  const speechPresetEl = document.getElementById("speechPreset");

  const speechCustomEl = document.getElementById("speechCustom");
  const inputPromptEl = document.getElementById("inputPrompt");
  const outputPromptEl = document.getElementById("outputPrompt");
  const statusEl = document.getElementById("status");

  const transformBtn = document.getElementById("transformBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");
  const openFlowBtn = document.getElementById("openFlowBtn");

  const imageInput = document.getElementById("imageInput");
  const imageInfo = document.getElementById("imageInfo");
  const imagePreview = document.getElementById("imagePreview");

  // เก็บ base64 รูปล่าสุด (ถ้ามี)
  let imageBase64 = null;

  // ---------- จัดการรูป ----------
  if (imageInput) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files && imageInput.files[0];
      imageBase64 = null;
      if (imageInfo) imageInfo.textContent = "";
      if (imagePreview) {
        imagePreview.style.display = "none";
        imagePreview.src = "";
      }

      if (!file) return;

      if (imageInfo) {
        imageInfo.textContent = `${file.name} (${Math.round(
          file.size / 1024
        )} KB)`;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result; // data:image/...;base64,xxxx
        if (imagePreview) {
          imagePreview.src = result;
          imagePreview.style.display = "block";
        }

        const commaIndex = result.indexOf(",");
        if (commaIndex !== -1) {
          imageBase64 = result.substring(commaIndex + 1);
        } else {
          imageBase64 = null;
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------- helper ----------
  function setStatus(msg, type = "normal") {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.className = "status";
    if (type === "error") statusEl.classList.add("error");
    if (type === "ok") statusEl.classList.add("ok");
  }

  function buildFinalPrompt() {
    const mode = modeEl?.value || "";

    const actorPreset = actorPresetEl?.value.trim() || "";
    const scenePreset = scenePresetEl?.value.trim() || "";
    const flowPreset = flowPresetEl?.value.trim() || "";
    const speechPreset = speechPresetEl?.value.trim() || "";

    const speechCustom = speechCustomEl?.value.trim() || "";
    const userPrompt = inputPromptEl?.value.trim() || "";

    let finalPrompt = "";

    // รวม preset ทั้งหมดเป็น section
    finalPrompt += "=== ตัวช่วย Preset จากหน้าเว็บ ===\n";
    if (actorPreset) finalPrompt += `ตัวนักแสดง (Talent):\n${actorPreset}\n\n`;
    if (scenePreset) finalPrompt += `ฉาก / สถานที่:\n${scenePreset}\n\n`;
    if (flowPreset) finalPrompt += `ลำดับเหตุการณ์ (Sequence):\n${flowPreset}\n\n`;
    if (speechPreset)
      finalPrompt += `โทนบทพูดนักแสดง (Speech Tone):\n${speechPreset}\n\n`;

    finalPrompt += "=== รายละเอียดจากผู้ใช้พิมพ์เอง ===\n";
    if (userPrompt) {
      finalPrompt += `${userPrompt}\n\n`;
    } else {
      finalPrompt += "(ผู้ใช้ยังไม่พิมพ์รายละเอียดสินค้า / โปร / บรรยากาศ)\n\n";
    }

    // ส่วนสำคัญ: ประโยคบทพูดหลัก
    if (speechCustom) {
      finalPrompt +=
        'ประโยคบทพูดหลักของนักแสดง (ผู้ใช้ต้องการให้พูดหรือใช้เป็นแกนหลักของบทพูด):\n';
      finalPrompt += speechCustom + "\n";
    }

    finalPrompt += "\n=== หมายเหตุเพิ่มเติมจากหน้าเว็บ ===\n";
    finalPrompt +=
      '- ถ้าใน preset หรือ prompt มีคำว่า "ตามรูป" ให้ถือว่ามีรูปสินค้าจริงแนบมา\n';
    finalPrompt +=
      "- ถ้าข้อมูลไม่ครบ ให้ช่วยจินตนาการเติมให้เนียน เหมาะกับสินค้าประเภทนั้น\n";

    return { finalPrompt, mode };
  }

  async function callTransformAPI() {
    const { finalPrompt, mode } = buildFinalPrompt();

    if (!finalPrompt.trim()) {
      setStatus("กรุณาใส่ Prompt อย่างน้อย 1 ส่วน (preset หรือ prompt ดิบ)", "error");
      return;
    }

    try {
      if (transformBtn) transformBtn.disabled = true;
      setStatus("กำลังเรียก AI แปลง Prompt ...", "normal");

      const resp = await fetch("/api/transform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          mode: mode || "veo31_shirt",
          imageData: imageBase64 || null,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.error("API error:", data);
        setStatus(
          data.error || "มีข้อผิดพลาดจาก API (สถานะไม่ใช่ 200)",
          "error"
        );
        return;
      }

      const resultText = data.result || "";
      if (outputPromptEl) {
        outputPromptEl.value = resultText;
      }

      setStatus("✅ แปลง Prompt สำเร็จแล้ว", "ok");
    } catch (err) {
      console.error("Fetch error:", err);
      setStatus(
        "มีปัญหาเชื่อมต่อกับ server หรือ Render (ดู console เพิ่มเติม)",
        "error"
      );
    } finally {
      if (transformBtn) transformBtn.disabled = false;
    }
  }

  // ---------- ปุ่มต่าง ๆ ----------

  // ปุ่ม แปลง Prompt ด้วย AI
  if (transformBtn) {
    transformBtn.addEventListener("click", () => {
      callTransformAPI();
    });
  }

  // ปุ่ม ล้างทุกช่อง
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (inputPromptEl) inputPromptEl.value = "";
      if (speechCustomEl) speechCustomEl.value = "";
      if (outputPromptEl) outputPromptEl.value = "";
      if (actorPresetEl) actorPresetEl.value = "";
      if (scenePresetEl) scenePresetEl.value = "";
      if (flowPresetEl) flowPresetEl.value = "";
      if (speechPresetEl) speechPresetEl.value = "";
      if (imageInput) imageInput.value = "";
      if (imageInfo) imageInfo.textContent = "";
      if (imagePreview) {
        imagePreview.src = "";
        imagePreview.style.display = "none";
      }
      imageBase64 = null;
      setStatus("", "normal");
    });
  }

  // ปุ่ม คัดลอกผลลัพธ์
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      if (!outputPromptEl || !outputPromptEl.value.trim()) {
        setStatus("ยังไม่มีผลลัพธ์ให้คัดลอก", "error");
        return;
      }
      try {
        await navigator.clipboard.writeText(outputPromptEl.value);
        setStatus("✅ คัดลอกผลลัพธ์แล้ว", "ok");
      } catch (err) {
        console.error("Clipboard error:", err);
        setStatus("คัดลอกไม่สำเร็จ (สิทธิ์ clipboard ไม่อนุญาต)", "error");
      }
    });
  }

  // ปุ่ม คัดลอก + เปิด Flow Veo 3.1
  if (openFlowBtn) {
    openFlowBtn.addEventListener("click", async () => {
      if (outputPromptEl && outputPromptEl.value.trim()) {
        try {
          await navigator.clipboard.writeText(outputPromptEl.value);
          setStatus("✅ คัดลอกผลลัพธ์แล้ว และกำลังเปิด Flow Veo 3.1", "ok");
        } catch (err) {
          console.error("Clipboard error:", err);
          setStatus(
            "คัดลอกไม่สำเร็จ แต่จะเปิด Flow Veo 3.1 ให้ก่อน",
            "error"
          );
        }
      }

      // แก้ URL นี้เป็นลิงก์ Flow Veo 3.1 ของคุณเอง
      const flowUrl = "https://www.google.com";
      window.open(flowUrl, "_blank");
    });
  }
});
