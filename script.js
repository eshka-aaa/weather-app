// ===============================
// Elements
// ===============================

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const weather = document.getElementById("weather");
const saveCityBtn = document.getElementById("saveCityBtn");
const favoriteCities = document.getElementById("favoriteCities");
const recentCities = document.getElementById("recentCities");
const locationBtn = document.getElementById("locationBtn");
const clearBtn = document.getElementById("clearBtn");
const unitBtn = document.getElementById("unitBtn");

// ===============================
// State
// ===============================

let currentLang = "en";
let currentUnit = "C";
let lastWeatherData = null;

let savedCities = JSON.parse(localStorage.getItem("savedCities")) || [];
let recent = JSON.parse(localStorage.getItem("recentCities")) || [];

// ===============================
// Search weather by city
// ===============================

searchBtn.onclick = async function () {
  const city = cityInput.value.trim();

  if (city === "") return;

  currentLang = detectLanguage(city);

  try {
    weather.innerHTML = "<p>Loading...</p>";

    const geoUrl =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${currentLang}`;

    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoData.results) {
      weather.innerHTML = "<p>City not found ❌</p>";
      return;
    }

    const place = geoData.results[0];

    const weatherData = await getWeatherData(
      place.latitude,
      place.longitude
    );

    saveRecent(city);

    showWeather({
      city: place.country
        ? `${place.name || city}, ${place.country}`
        : place.name || city,

      countryCode: place.country_code,

      temp: weatherData.current.temperature_2m,
      feels: weatherData.current.apparent_temperature,
      humidity: weatherData.current.relative_humidity_2m,
      wind: weatherData.current.wind_speed_10m,
      time: getCurrentTime(),

      emoji: getWeatherEmoji(weatherData.current.temperature_2m),
      bgClass: getWeatherBackground(weatherData.current.temperature_2m),

      forecast: weatherData.daily
    });
  } catch {
    weather.innerHTML = "<p>Something went wrong ❌</p>";
  }
};

// ===============================
// Fetch weather data
// ===============================

async function getWeatherData(lat, lon) {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min`;

  const response = await fetch(weatherUrl);
  return await response.json();
}

// ===============================
// Render weather card
// ===============================

function showWeather(data) {
  lastWeatherData = data;

  document.body.className = "";
  document.body.classList.add(data.bgClass);

  const forecastHtml = data.forecast.time
    .slice(0, 3)
    .map((day, index) => {
      return `
        <div class="forecast-day">
          <span>${formatDay(day, index)}</span>

          <span>
            ${convertTemp(data.forecast.temperature_2m_min[index])}°${currentUnit}
            /
            ${convertTemp(data.forecast.temperature_2m_max[index])}°${currentUnit}
          </span>
        </div>
      `;
    })
    .join("");

  weather.innerHTML = `
    <div class="weather-card">
      <h2>
        ${getFlag(data.countryCode)}
        ${data.city}
      </h2>

      <div class="weather-icon">
        ${data.emoji}
      </div>

      <h1>
        ${convertTemp(data.temp)}°${currentUnit}
      </h1>

      <p class="city-time">
        ${t("updated")}: ${data.time}
      </p>

      <p>
        ${t("feelsLike")}: ${convertTemp(data.feels)}°${currentUnit}
      </p>

      <p class="feel-label">
        ${getFeelLabel(data.feels)}
      </p>

      <p>${t("humidity")}: ${data.humidity}%</p>
      <p>${t("wind")}: ${data.wind} km/h</p>

      <div class="forecast">
        <h3>${t("forecast")}</h3>
        ${forecastHtml}
      </div>
    </div>
  `;
}

// ===============================
// Enter key search
// ===============================

cityInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    searchBtn.click();
  }
});

// ===============================
// Weather helpers
// ===============================

function getWeatherEmoji(temp) {
  if (temp <= 0) return "❄";
  if (temp <= 10) return "🌧";
  if (temp <= 20) return "☁";
  if (temp <= 30) return "☀";

  return "🔥";
}

function getWeatherBackground(temp) {
  if (temp <= 0) return "cold-bg";
  if (temp <= 10) return "rain-bg";
  if (temp <= 20) return "cloud-bg";
  if (temp <= 30) return "sun-bg";

  return "hot-bg";
}

function getFeelLabel(feels) {
  if (feels <= 5) return t("cold");
  if (feels <= 18) return t("cool");
  if (feels <= 26) return t("comfortable");

  return t("hot");
}

function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function convertTemp(temp) {
  if (currentUnit === "C") {
    return temp;
  }

  return Math.round((temp * 9) / 5 + 32);
}

// ===============================
// Temperature unit switch
// ===============================

unitBtn.onclick = function () {
  currentUnit = currentUnit === "C" ? "F" : "C";

  unitBtn.innerText = currentUnit === "C" ? "°F" : "°C";

  if (lastWeatherData) {
    showWeather(lastWeatherData);
  }
};

// ===============================
// Favorite cities
// ===============================

saveCityBtn.onclick = function () {
  const city = cityInput.value.trim();

  if (city === "") return;
  if (savedCities.includes(city)) return;

  savedCities.push(city);
  localStorage.setItem("savedCities", JSON.stringify(savedCities));

  renderSavedCities();
};

function renderSavedCities() {
  favoriteCities.innerHTML = "";

  savedCities.forEach((city) => {
    favoriteCities.innerHTML += `
      <div class="city-item">
        <button onclick="searchSavedCity('${city}')">
          ${city}
        </button>

        <button onclick="deleteSavedCity('${city}')">
          ❌
        </button>
      </div>
    `;
  });
}

function searchSavedCity(city) {
  cityInput.value = city;
  searchBtn.click();
}

function deleteSavedCity(city) {
  savedCities = savedCities.filter((savedCity) => savedCity !== city);

  localStorage.setItem("savedCities", JSON.stringify(savedCities));

  renderSavedCities();
}

// ===============================
// Recent searches
// ===============================

function saveRecent(city) {
  recent = recent.filter((savedCity) => savedCity !== city);

  recent.unshift(city);
  recent = recent.slice(0, 5);

  localStorage.setItem("recentCities", JSON.stringify(recent));

  renderRecent();
}

function renderRecent() {
  recentCities.innerHTML = "";

  recent.forEach((city) => {
    recentCities.innerHTML += `
      <button onclick="searchSavedCity('${city}')">
        ${city}
      </button>
    `;
  });
}

// ===============================
// Location weather
// ===============================

locationBtn.onclick = function () {
  weather.innerHTML = "<p>Requesting location...</p>";

  if (!navigator.geolocation) {
    weather.innerHTML = "<p>Geolocation is not supported ❌</p>";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async function (position) {
      try {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        weather.innerHTML = "<p>Loading...</p>";

        const data = await getWeatherData(lat, lon);

        showWeather({
          city: "Your location",
          countryCode: "",

          temp: data.current.temperature_2m,
          feels: data.current.apparent_temperature,
          humidity: data.current.relative_humidity_2m,
          wind: data.current.wind_speed_10m,
          time: getCurrentTime(),

          emoji: getWeatherEmoji(data.current.temperature_2m),
          bgClass: getWeatherBackground(data.current.temperature_2m),

          forecast: data.daily
        });
      } catch {
        weather.innerHTML = "<p>Weather loading failed ❌</p>";
      }
    },

    function () {
      weather.innerHTML = "<p>Location permission denied ❌</p>";
    }
  );
};

// ===============================
// Clear app
// ===============================

clearBtn.onclick = function () {
  cityInput.value = "";
  weather.innerHTML = "";

  document.body.className = "";
};

// ===============================
// Date formatting
// ===============================

function formatDay(dateString, index) {
  if (index === 0) return t("today");
  if (index === 1) return t("tomorrow");

  const date = new Date(dateString);

  return date.toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", {
    weekday: "long"
  });
}

// ===============================
// Country flag
// ===============================

function getFlag(code) {
  if (!code) return "";

  return code
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt())
    );
}

// ===============================
// Language detection / translations
// ===============================

function detectLanguage(text) {
  if (/[іїєґ]/i.test(text)) return "uk";
  if (/[а-яё]/i.test(text)) return "ru";
  if (/[ąćęłńóśźż]/i.test(text)) return "pl";

  return "en";
}

function t(key) {
  const translations = {
    en: {
      updated: "Updated",
      feelsLike: "Feels like",
      humidity: "Humidity",
      wind: "Wind",
      forecast: "3-day forecast",
      today: "Today",
      tomorrow: "Tomorrow",
      cold: "Feels cold",
      cool: "Feels cool",
      comfortable: "Feels comfortable",
      hot: "Feels hot"
    },

    ru: {
      updated: "Обновлено",
      feelsLike: "Ощущается как",
      humidity: "Влажность",
      wind: "Ветер",
      forecast: "Прогноз на 3 дня",
      today: "Сегодня",
      tomorrow: "Завтра",
      cold: "Холодно",
      cool: "Прохладно",
      comfortable: "Комфортно",
      hot: "Жарко"
    },

    uk: {
      updated: "Оновлено",
      feelsLike: "Відчувається як",
      humidity: "Вологість",
      wind: "Вітер",
      forecast: "Прогноз на 3 дні",
      today: "Сьогодні",
      tomorrow: "Завтра",
      cold: "Холодно",
      cool: "Прохолодно",
      comfortable: "Комфортно",
      hot: "Спекотно"
    },

    pl: {
      updated: "Zaktualizowano",
      feelsLike: "Odczuwalna",
      humidity: "Wilgotność",
      wind: "Wiatr",
      forecast: "Prognoza na 3 dni",
      today: "Dzisiaj",
      tomorrow: "Jutro",
      cold: "Zimno",
      cool: "Chłodno",
      comfortable: "Komfortowo",
      hot: "Gorąco"
    }
  };

  return translations[currentLang][key];
}

// ===============================
// Initial render
// ===============================

renderSavedCities();
renderRecent();