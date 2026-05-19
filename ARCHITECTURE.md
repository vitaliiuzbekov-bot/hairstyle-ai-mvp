# AI Pipeline & Architecture Roadmap: Realistic Hairstyle Telegram Mini App

## 1. Проанализируй текущий MVP как production AI product

**Текущий стек и его проблемы:**
*   **Текущая модель (Gemini 2.5 Flash Image Editor):** Отличная модель для базового редактирования, но она не адаптирована под **strict face identity preservation** (сохранение лица). При замене прически она часто меняет черты лица (глаза, скулы, подбородок) или «грязно» смешивает их с новыми волосами.
*   **Отсутствие пайплайна сегментации:** В MVP нет маскирования волос (Hair Segmentation Pipeline). Из-за этого сетка перерисовывает слишком большие участки (включая лицо и фон), пытаясь согласовать новую прическу со старым образом.
*   **Архитектурный bottleneck:** Текущая реализация отправляет base64 картинки напрямую, что работает для легкой Gemini, но не выдержит масштабирования (тяжелые payload-ы).

## 2. Лучшая AI модель для Hairstyle Transfer

Для *идеального* результата без потери лица сегодня лидируют две комбинации:
1.  **SDXL + InstantID + ControlNet Inpaint + Hair Masking:** Самый проверенный подход. InstantID держит лицо на 100%, Inpaint-маска ограничивает зону изменений только волосами (или чуть шире), а текстовый prompt задает стиль.
2.  **FLUX.1 [dev] + PuLID (Face Preservation) + Inpainting:** Самая мощная модель для невероятного фотореализма, но более дорогая и медленная в инференсе, чем SDXL.

**Рекомендация:** На старте использовать **SDXL + InstantID**. Это даст наилучший баланс скорости (2-4 секунды), цены и сохранения 100% лица.

## 3. Выбор AI провайдера (API Provider)

1.  **Fal.ai (Best Production Provider):**
    *   **Почему:** Позволяет запускать кастомные ComfyUI-воркфлоу (или готовые endpoints) как serverless API. Они ультра-быстрые и надежные. Стоимость генерации SDXL через их endpoints копеечная.
2.  **Runware.ai (Best Cheap & Fast):**
    *   **Почему:** Дешевле Fal, очень быстрые, есть поддержка SDXL Inpainting, но может быть сложнее собрать кастомный Face Preservation (InstantID) пайплайн через их базовое API.
3.  **Hugging Face Inference Endpoints / Replicate (Good Alternatives):** Replicate популярен, но холодные старты (cold boots) могут убить UX в Telegram Mini App, где пользователь ждет ответ мгновенно.

**Рекомендация провайдера:** **Fal.ai** для продакшена (есть поддержка серверлесс ComfyUI). Если нужен полностью бесплатный/стартовый подход — **Civitai API** или **HuggingFace Serverless** (но они не гарантируют стабильность).

## 4. Full Production Architecture

**Backend Stack:**
*   Node.js (Express) + TypeScript.
*   **База Данных:** Firebase Firestore (уже есть, идеально для real-time).
*   **Хранилище:** Firebase Storage (для хранения исходников и генераций) — *Вместо Base64*!
*   **Очереди (Queue):** BullMQ + Redis. Обязательны, так как AI генерация — это долгий процесс. Пользователь делает запрос, он падает в очередь.

**Где хостить:** Render (пойдет для старта) -> при росте переход на Google Cloud Run / AWS ECS.

## 5. Hairstyle Transfer Pipeline (The Secret Sauce)

1.  **USER PHOTO:** Пользователь загружает фото.
2.  **PREPROCESSING (Face Crop & Align):** Фото обрезается вокруг лица. Это критически важно, AI плохо работает с фото в полный рост при инпеинтинге волос.
3.  **HAIR SEGMENTATION:** Используется облегченная модель (например, BiSeNet или Segment-Anything - SAM) чтобы создать маску волос пользователя + маску фона вокруг головы.
4.  **INPAINTING & FACE LOCK (SDXL InstantID):**
    *   *Mask:* Зона оригинальных волос + расширенная зона для новой прически.
    *   *ControlNet / InstantID:* Замораживает черты лица (глаза, нос, губы) по референсному фото (original face).
    *   *Reference Image (StyleAdapter/IP-Adapter):* Передает *стиль* (цвет и текстуру) новой прически из выбранного референса пользователя.
5.  **POSTPROCESSING:** Легкий upscale (CodeFormer/GFPGAN) для восстановления качества лица, если оно слегка «поплыло».
6.  **TELEGRAM DELIVERY:** Отправка готового фото по Webhook обратно в Mini App.

## 6. Как сохранить лицо (Face Preservation Method)

Весь секрет заключается в использовании **InstantID** или **FaceID (IP-Adapter)**. В отличие от Roope или Roop (обычный face swap, который часто выглядит как «приклеенное» лицо), InstantID встраивается в сам процесс генерации, генерируя картинку *вокруг* заданного лица. В связке с Inpaint (где лицо покрыто черным на маске = не изменяется), мы гарантируем 100% схожесть.

## 7. Telegram Mini App Optimization

*   **Upload Flow:** Файл не грузится сразу на ваш Node.js сервер. Клиент получает подписанный URL (Pre-signed URL) и грузит фотку напрямую в Firebase Storage (разгружаем сервер).
*   **Async Generation:** Сервер только принимает команду `generate(image_path, style_id)` и ставит в очередь (Redis). Возвращает `job_id`.
*   **Progress Updates:** Клиент (через Firebase onSnapshot) слушает статус документа `job_id`. Как только статус меняется на `completed`, подгружается фото.
*   **Блокировка UI:** Во время ожидания (10-15 сек) показываются интересные бьюти-факты или скелетон анимация, чтобы юзер не ушел.

## 8. Queue System & GPU Recommendation

*   Вместо аренды собственного сервера с GPU (что очень дорого, например RTX 4090 / A100 = от $200-$1000/мес), мы используем **Serverless GPU API** (Fal.ai). Мы платим *только за миллисекунды инференса*.
*   Queue System: BullMQ на нашем сервере управляет rate limits и retry logic. Она вызывает API Fal.ai. Если Fal.ai возвращает webhook -> BullMQ обновляет Firestore -> Telegram App обновляется.

## 9. Промпты (Prompts)

*   **Positive Prompt (Base):**
    `"Professional editorial photography, gorgeous [MAN/WOMAN], center framed, highly detailed, photorealistic, 8k resolution, elegant, high fashion, perfect lighting, masterpiece."`
*   **Hairstyle Modifiers:**
    `"wearing a [STYLE_NAME] hairstyle, [COLOR] hair color, realistic hair texture, fine strands, salon quality blow-out."`
*   **Negative Prompt:**
    `"ugly, blurry, deformed, cartoon, illustration, low quality, bad anatomy, poorly drawn face, bad proportions, unnatural hair, plastic texture, text, watermark, mutated."`

## 10. Cost Estimation & Scaling Strategy (Monthly)

**Оценка при 10,000 MAU (по 3 генерации = 30,000 генераций):**
*   **Backend Hosting (Render/GCP):** ~$10 - $20 / мес.
*   **Database (Firebase):** Бесплатно / ~$5 / мес.
*   **AI API (Fal.ai - SDXL):** ~$0.001 за фото = $30 / мес.
*   **Итого:** Всего ~$50 в месяц для очень приличного старта 10к пользователей.

**Масштабирование:** При росте до 100k пользователей, мы легко масштабируем Node.js серверы, так как GPU-инференс делегирован провайдерам. Redis-очередь сгладит спайки (пиковые нагрузки).

## 11. Final Recommendation (Best Balance)

Для максимального качества при низком пороге входа и нулевых изначальных костах на свое GPU-железо:
1.  **Frontend/Backend:** Оставляем React + Node.js/Telegram Mini App + Firebase (как есть, но рефакторим под очереди и Firebase Storage).
2.  **AI Stack:** **Fal.ai** + **ComfyUI Workflow (InstantID + IP-Adapter + Inpaint)**. Запрашиваем генерацию через их API серверлесс.
3.  **Speed/Cost:** Inpaint-пасс будет длиться около ~3 секунд. Одна генерация будет стоить меньше 1/5 цента. Качество — глянцевый журнал без потери лица.

---
### 📍 Step-by-Step Roadmap к Production:

**Фаза 1: Фикс MVP (Current Setup)**
*   Перейти на загрузку файлов в Firebase Storage вместо обработки Base64 в памяти. Так приложение перестанет «падать».

**Фаза 2: Интеграция Serverless AI**
*   Зарегистрироваться на Fal.ai или Replicate. Переписать роут `/api/generate-ar`, чтобы он отправлял задачу к ним через webhook.

**Фаза 3: Внедрение ComfyUI Workflow**
*   Найти/создать идеальный процесс в ComfyUI (InstantID + Hair Segmentation). Загрузить этот Workflow на Fal.ai. Вызывать его по API.

**Фаза 4: Удержание и монетизация**
*   Добавить Telegram Stars / YooKassa для покупки генераций (уже в зачатке есть мок-платежи). Настроить реферальную систему внутри Mini App.
