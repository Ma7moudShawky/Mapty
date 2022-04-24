'use strict';

const form = document.querySelector('.form');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const containerWorkouts = document.querySelector('.workouts');
const showAllButton = document.getElementById('showAll');
class App {
  #map;
  #mapEvent;
  #workOuts = [];
  constructor() {
    this.getCurrnetLocation();
    form.addEventListener('submit', this.newWorkOut.bind(this));
    inputType.addEventListener('change', this.toggleElevationField);
    containerWorkouts.addEventListener('click', this.moveToWorkout.bind(this));
    this.renderFromLocalStorage();
    showAllButton.addEventListener(
      'click',
      function (e) {
        const allCoords = this.#workOuts.map(function (work) {
          return work.coords;
        });

        if (allCoords.length === 0) return;
        this.#map.fitBounds(allCoords, {
          padding: [50, 50],
        });
      }.bind(this)
    );
  }
  getCurrnetLocation() {
    const loc = navigator.geolocation.getCurrentPosition(
      this.laodMap.bind(this),
      () => alert(`Can't Get Your Location .. Try Again later!`)
    );
  }
  laodMap(position) {
    const { latitude, longitude } = position.coords;
    this.#map = L.map('map').setView([latitude, longitude], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this.showForm.bind(this));
    this.#workOuts.forEach(workout => this.renderWorkoutMarker(workout));
  }
  showForm(mapEvent) {
    this.#mapEvent = mapEvent;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  newWorkOut(e) {
    e.preventDefault();
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const cadence = +inputCadence.value;
    const elevation = +inputElevation.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    if (type === 'running') {
      if (
        !this.validate(distance, duration, cadence) ||
        !this.allPositive(distance, duration, cadence)
      )
        return alert('Input Positive Numbers');
      workout = new Running(distance, duration, [lat, lng], cadence);
    }
    if (type === 'cycling') {
      if (
        !this.validate(distance, duration, elevation) ||
        !this.allPositive(distance, duration)
      )
        return alert('Input Positive Numbers');
      workout = new Cycling(distance, duration, [lat, lng], elevation);
    }
    this.hideForm();
    this.#workOuts.push(workout);
    this.renderWorkout(workout);
    this.renderWorkoutMarker(workout);
    this.addToLocalStorage();
  }
  validate(...inputs) {
    return inputs.every(input => Number.isFinite(input));
  }
  allPositive = (...inputs) => inputs.every(input => input > 0);
  hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    inputType.value = 'running';
    inputElevation.closest('.form__row').classList.add('form__row--hidden');
    inputCadence.closest('.form__row').classList.remove('form__row--hidden');
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;
    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }
  renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  moveToWorkout(e) {
    if (!this.#map) return;
    const targetWorkoutel = e.target.closest('.workout');
    if (!targetWorkoutel) return;
    const targetWorkout = this.#workOuts.find(
      el => el.id === targetWorkoutel.dataset.id
    );
    this.#map.setView(targetWorkout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  addToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workOuts));
  }
  renderFromLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workOuts = data;
    this.#workOuts.forEach(workout => this.renderWorkout(workout));
  }
}
class WorkOut {
  date = new Date();
  id = Date.now() + ''.slice(-10);
  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }
  setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends WorkOut {
  type = 'running';
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.setDescription();
    this.calcPace();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends WorkOut {
  type = 'cycling';

  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this.setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
const app = new App();
