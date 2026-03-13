const initTranscriptModal = () => {
  const modal = document.getElementById("transcriptModal");
  if (!modal) return;

  const titleEl = document.getElementById("modalTitle");
  const bodyEl = document.getElementById("modalBody");

  const openModal = (heading, text) => {
    if (titleEl) {
      titleEl.textContent = heading;
    }
    if (bodyEl) {
      // Используем innerHTML с <pre> для сохранения переносов строк
      bodyEl.innerHTML = `<pre style="white-space: pre-wrap; word-wrap: break-word; margin: 0; padding: 0; font-family: inherit; font-size: inherit; line-height: inherit;">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
    }
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  };

  modal.addEventListener("click", (event) => {
    if (
      event.target === modal ||
      event.target.hasAttribute("data-close-modal")
    ) {
      closeModal();
    }
  });

  document.querySelectorAll(".js-transcript-view").forEach((button) => {
    button.addEventListener("click", () => {
      const title = button.dataset.transcriptTitle || "Транскрипт";
      const body = button.dataset.transcriptBody || "";
      openModal(title, body);
    });
  });
};

const initManagerDropdowns = () => {
  const dropdowns = document.querySelectorAll("[data-manager-dropdown]");
  if (!dropdowns.length) return;

  dropdowns.forEach((dropdown) => {
    const toggle = dropdown.querySelector("[data-dropdown-toggle]");
    const menu = dropdown.querySelector("[data-dropdown-menu]");
    const hiddenInput = dropdown.querySelector('input[name="manager"]');
    const label = dropdown.querySelector(".manager-dropdown__label");
    const options = dropdown.querySelectorAll("[data-dropdown-option]");
    const form = dropdown.closest("form");

    if (!toggle || !menu || !hiddenInput) {
      return;
    }

    let isOpen = false;
    if (menu) {
      menu.setAttribute("aria-hidden", "true");
    }

    const open = () => {
      dropdown.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      if (menu) {
        menu.setAttribute("aria-hidden", "false");
      }
      isOpen = true;
    };

    const close = () => {
      dropdown.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      if (menu) {
        menu.setAttribute("aria-hidden", "true");
      }
      isOpen = false;
    };

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      if (isOpen) {
        close();
      } else {
        open();
      }
    });

    options.forEach((option) => {
      option.addEventListener("click", (event) => {
        event.preventDefault();
        const value = option.dataset.value || "";
        hiddenInput.value = value;
        if (label) {
          label.textContent = option.textContent.trim();
        }
        options.forEach((btn) => {
          btn.classList.toggle("is-active", btn === option);
        });
        close();
        if (form) {
          form.submit();
        }
      });
    });

    document.addEventListener("click", (event) => {
      if (!dropdown.contains(event.target) && isOpen) {
        close();
      }
    });

    dropdown.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
        toggle.focus();
      }
    });
  });
};

const initValueDropdowns = () => {
  const dropdowns = document.querySelectorAll("[data-value-dropdown]");
  if (!dropdowns.length) return;

  dropdowns.forEach((dropdown) => {
    const toggle = dropdown.querySelector("[data-dropdown-toggle]");
    const menu = dropdown.querySelector("[data-dropdown-menu]");
    const label = dropdown.querySelector(".value-dropdown__label");
    // Ищем чекбоксы только внутри меню dropdown, чтобы не захватить скрытые поля формы
    const _checkboxes = menu
      ? menu.querySelectorAll("input[type='checkbox'][data-value-checkbox]")
      : [];
    const form = dropdown.closest("form");

    if (!toggle || !menu || !label) {
      return;
    }

    let isOpen = false;
    menu.setAttribute("aria-hidden", "true");

    const open = () => {
      dropdown.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-hidden", "false");
      isOpen = true;
    };

    const close = () => {
      dropdown.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-hidden", "true");
      isOpen = false;
    };

    const updateLabel = () => {
      // Получаем свежий список чекбоксов каждый раз, чтобы учесть возможные изменения
      const currentCheckboxes = menu.querySelectorAll(
        "input[type='checkbox'][data-value-checkbox]",
      );
      // Фильтруем только отмеченные чекбоксы, которые видимы и находятся в меню
      const checked = Array.from(currentCheckboxes).filter((cb) => {
        const isValid =
          cb.checked &&
          cb.type === "checkbox" &&
          cb.hasAttribute("data-value-checkbox") &&
          menu.contains(cb);
        return isValid;
      });

      const count = checked.length;
      // Убрали console.log для продакшена

      if (count === 0) {
        label.textContent = "Ценность (Любая)";
      } else if (count === 1) {
        label.textContent = `Ценность (${checked[0].value})`;
      } else if (count <= 2) {
        label.textContent = `Ценность (${checked.map((cb) => cb.value).join(", ")})`;
      } else {
        label.textContent = `Ценность (${count} выбрано)`;
      }
    };

    // Обновляем метку при загрузке страницы
    // Используем небольшую задержку, чтобы убедиться, что все чекбоксы инициализированы
    setTimeout(() => {
      updateLabel();
    }, 100);

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (isOpen) {
        close();
      } else {
        open();
      }
    });

    // Используем делегирование событий для обработки изменений чекбоксов
    // Это гарантирует, что мы всегда работаем с актуальными элементами
    menu.addEventListener("change", (event) => {
      const target = event.target;
      if (
        target &&
        target.type === "checkbox" &&
        target.hasAttribute("data-value-checkbox") &&
        menu.contains(target)
      ) {
        // Небольшая задержка, чтобы состояние чекбокса успело обновиться
        setTimeout(() => {
          updateLabel();
        }, 10);
        // Автоматически отправляем форму при изменении фильтра
        if (form) {
          form.submit();
        }
      }
    });

    // При клике вне меню закрываем его
    document.addEventListener("click", (event) => {
      if (!dropdown.contains(event.target) && isOpen) {
        close();
      }
    });

    dropdown.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
        toggle.focus();
      }
    });

    // При отправке формы обновляем страницу
    if (form) {
      form.addEventListener("submit", (_event) => {
        // Форма отправится с выбранными значениями
      });
    }
  });
};

const initOperatorDropdowns = () => {
  const dropdowns = document.querySelectorAll("[data-operator-dropdown]");
  if (!dropdowns.length) return;

  dropdowns.forEach((dropdown) => {
    const toggle = dropdown.querySelector("[data-dropdown-toggle]");
    const menu = dropdown.querySelector("[data-dropdown-menu]");
    const label = dropdown.querySelector(".operator-dropdown__label");
    const checkboxes = dropdown.querySelectorAll("[data-operator-checkbox]");
    const form = dropdown.closest("form");

    if (!toggle || !menu || !label) {
      return;
    }

    let isOpen = false;
    menu.setAttribute("aria-hidden", "true");

    const open = () => {
      dropdown.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-hidden", "false");
      isOpen = true;
    };

    const close = () => {
      dropdown.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-hidden", "true");
      isOpen = false;
    };

    const updateLabel = () => {
      const checked = Array.from(checkboxes).filter((cb) => cb.checked);
      const operatorNames = {
        megafon: "Мегафон",
        mango: "Манго",
      };

      if (checked.length === 0) {
        label.textContent = "Оператор (Все)";
      } else if (checked.length === 1) {
        label.textContent = `Оператор (${operatorNames[checked[0].value] || checked[0].value})`;
      } else {
        label.textContent = `Оператор (${checked.length} выбрано)`;
      }
    };

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (isOpen) {
        close();
      } else {
        open();
      }
    });

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        updateLabel();
        // Автоматически отправляем форму при изменении фильтра
        if (form) {
          form.submit();
        }
      });
    });

    // При клике вне меню закрываем его
    document.addEventListener("click", (event) => {
      if (!dropdown.contains(event.target) && isOpen) {
        close();
      }
    });

    dropdown.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
        toggle.focus();
      }
    });
  });
};

const initTranscribeForms = () => {
  const forms = document.querySelectorAll(".transcribe-form");

  forms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const _callId = form.dataset.callId;
      const transcribeModal = document.getElementById("transcribeModal");
      const transcribeModalTitle = document.getElementById(
        "transcribeModalTitle",
      );
      const transcribeModalBody = document.getElementById(
        "transcribeModalBody",
      );
      const transcribeStatusText = document.getElementById(
        "transcribeStatusText",
      );

      if (!transcribeModal) return;

      // Показываем popup "Идет транскрибация"
      transcribeModalTitle.textContent = "Транскрибация";
      transcribeStatusText.textContent = "Идет транскрибация...";
      transcribeModalBody.innerHTML = `
        <div class="transcribe-status">
          <div class="spinner"></div>
          <p id="transcribeStatusText">Идет транскрибация...</p>
        </div>
      `;
      transcribeModal.classList.add("is-open");
      transcribeModal.setAttribute("aria-hidden", "false");

      try {
        const formData = new FormData(form);
        const response = await fetch(form.action, {
          method: "POST",
          body: formData,
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
        });

        if (response.ok) {
          // Проверяем, был ли это AJAX запрос
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            const data = await response.json();
            if (data.success) {
              // Успешное завершение
              transcribeModalBody.innerHTML = `
                <div class="transcribe-status">
                  <div class="success-icon">✓</div>
                  <p id="transcribeStatusText">Существующий транскрипт будет обновлен.<br>Расшифровка завершена!</p>
                </div>
              `;

              // Закрываем popup через 2 секунды и перезагружаем страницу
              setTimeout(() => {
                transcribeModal.classList.remove("is-open");
                transcribeModal.setAttribute("aria-hidden", "true");
                window.location.reload();
              }, 2000);
            } else {
              throw new Error(data.error || "Ошибка транскрибации");
            }
          } else {
            // Обычный редирект - значит все прошло успешно
            transcribeModalBody.innerHTML = `
              <div class="transcribe-status">
                <div class="success-icon">✓</div>
                <p id="transcribeStatusText">Существующий транскрипт будет обновлен.<br>Расшифровка завершена!</p>
              </div>
            `;

            setTimeout(() => {
              transcribeModal.classList.remove("is-open");
              transcribeModal.setAttribute("aria-hidden", "true");
              window.location.reload();
            }, 2000);
          }
        } else {
          throw new Error(`Ошибка сервера: ${response.status}`);
        }
      } catch (error) {
        console.error("Ошибка транскрибации:", error);
        transcribeStatusText.textContent = `Ошибка: ${error.message}`;
        transcribeModalBody.innerHTML = `
          <div class="transcribe-status">
            <div class="error-icon">✗</div>
            <p id="transcribeStatusText">Ошибка: ${error.message}</p>
            <button type="button" class="primary-btn" style="margin-top: 16px;" onclick="document.getElementById('transcribeModal').classList.remove('is-open')">Закрыть</button>
          </div>
        `;
      }
    });
  });
};

const initTranscriptDialogModal = () => {
  const modal = document.getElementById("transcriptDialogModal");
  if (!modal) return;

  const bodyEl = document.getElementById("transcriptDialogBody");

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  };

  // Обработчик закрытия модального окна
  modal.addEventListener("click", (event) => {
    if (
      event.target === modal ||
      event.target.hasAttribute("data-close-modal")
    ) {
      closeModal();
    }
  });

  // Обработчик кнопок "Расшифровка"
  document.querySelectorAll(".js-show-transcript-btn").forEach((button) => {
    button.addEventListener("click", async function () {
      const callId = this.dataset.callId;
      const _callFilename = this.dataset.callFilename;

      if (!callId) {
        alert("Ошибка: не указан ID звонка");
        return;
      }

      // Показываем модальное окно с загрузкой
      if (bodyEl) {
        bodyEl.innerHTML = `
          <div class="transcribe-status">
            <div class="spinner"></div>
            <p>Загрузка расшифровки...</p>
          </div>
        `;
      }
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");

      try {
        const response = await fetch(`/calls/${callId}/assemblyai_response`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data.success && bodyEl) {
          // Экранируем HTML символы и заменяем переносы строк на <br>
          const dialogHtml = data.dialog
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n\n/g, "<br><br>")
            .replace(/\n/g, "<br>");

          bodyEl.innerHTML = `<div style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', monospace; line-height: 1.8;">${dialogHtml}</div>`;
        } else {
          bodyEl.innerHTML = `
            <div class="transcribe-status">
              <div class="error-icon">✗</div>
              <p>Ошибка: ${data.error || "Неизвестная ошибка"}</p>
              <button type="button" class="primary-btn" style="margin-top: 16px;" onclick="document.getElementById('transcriptDialogModal').classList.remove('is-open')">Закрыть</button>
            </div>
          `;
        }
      } catch (e) {
        if (bodyEl) {
          bodyEl.innerHTML = `
            <div class="transcribe-status">
              <div class="error-icon">✗</div>
              <p>Ошибка сети: ${e.message}</p>
              <button type="button" class="primary-btn" style="margin-top: 16px;" onclick="document.getElementById('transcriptDialogModal').classList.remove('is-open')">Закрыть</button>
            </div>
          `;
        }
      }
    });
  });
};

const initRowClicks = () => {
  // Используем делегирование на контейнере, так как таблица может обновляться через HTMX
  const container = document.getElementById("call-list-container");
  if (!container) return;

  container.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-call-id]");
    if (!row) return;

    // Игнорируем клики, если нажали на ссылку, кнопку или другой интерактивный элемент
    const interactive = event.target.closest(
      "a, button, input, .record-icon, .js-transcript-view",
    );
    if (interactive) return;

    const callId = row.dataset.callId;
    if (callId) {
      window.location.href = `/calls/${callId}`;
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initTranscriptModal();
  initManagerDropdowns();
  initValueDropdowns();
  initOperatorDropdowns();
  initTranscribeForms();
  initTranscriptDialogModal();
  initRowClicks();
});
