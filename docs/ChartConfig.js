/* eslint-disable no-underscore-dangle */
import CASES from './data/timelines.js'; // eslint-disable-line import/extensions
import TESTS from './data/tests.js'; // eslint-disable-line import/extensions
import * as util from './util.js'; // eslint-disable-line import/extensions

const MINIMUM_CASES = 2;
const SLOVAK_POPULATION = 5435343;
const POPULATION = {
  Austria: 8772865,
  Czechia: 10578820,
  Germany: 82521653,
  Spain: 46528966,
  Hungary: 9772756,
  Italy: 60589445,
  Poland: 37972964,
  Slovakia: 5435343,
  Norway: 5367580,
};

const _X_AXE = {
  display: true,
  scaleLabel: {
    display: true,
    labelString: 'Dni od 2 prípadov / počet obyvateľov Slovenska)',
  },
};

export default class ChartConfig {
  constructor(canvasId) {
    this.colors = [
      '#36a2eb',
      '#ff6384',
      '#ffa600',
      '#ff7c43',
      '#2f4b7c',
      '#d45087',
      '#a05195',
      '#665191',
    ];
    this.canvasId = canvasId;
    this.isDaily = this.canvasId.includes('daily');
    this.isTests = this.canvasId.includes('tests');
    this.countries = this.isTests ? TESTS : CASES;
    this.defaults = this.isTests ? util.DEFAULT_TESTS : util.DEFAULT_CASES;
    this.checkboxes = [];
    this.countryNameToColor = {};
  }

  // 'private' methods

  _createCasesTimeline(country) {
    const timeline = [];
    const multiplier = SLOVAK_POPULATION / POPULATION[country.name];
    let yesterday = 0;

    country.days.forEach((day) => {
      const normalizedDay = day * multiplier;
      if (normalizedDay >= MINIMUM_CASES) {
        const normalizedValue = ((day - yesterday) * multiplier).toFixed(2);
        timeline.push(normalizedValue);
        if (this.isDaily) {
          yesterday = day;
        }
      }
    });

    return timeline;
  }

  _createTestsTimeline(country, validDays) {
    const timeline = [];
    const multiplier = SLOVAK_POPULATION / POPULATION[country.name];
    let yesterday = 0;

    country.days.slice(country.days.length - validDays).forEach((day) => {
      const normalizedValue = ((day - yesterday) * multiplier).toFixed(2);
      timeline.push(normalizedValue);
      if (this.isDaily) {
        yesterday = day;
      }
    });

    return timeline;
  }

  _createChartjsDataset(country) {
    let color = this.countryNameToColor[`${country.name}`];
    if (!color) {
      color = this.colors.shift();
      this.countryNameToColor[`${country.name}`] = color;
    }
    if (util.isTest(country)) {
      color = `${color}33`;
    }
    let timeline = this._createCasesTimeline(country);
    if (this.isTests) {
      timeline = this._createCasesTimeline(country, timeline.length);
    }

    return {
      label: country.id,
      backgroundColor: color,
      borderColor: color,
      data: timeline,
      yAxisID: 'left-y-axis',
      fill: false,
    };
  }

  _disableUnchecked() {
    this.checkboxes.forEach((checkbox) => {
      if (!checkbox.checked) {
        checkbox.disabled = true;
      }
    });
  }

  _enableUnchecked() {
    this.checkboxes.forEach((checkbox) => {
      if (!checkbox.checked) {
        checkbox.disabled = false;
      }
    });
  }

  _getCountryById(countryId) {
    let result;
    this.countries.forEach((country) => {
      if (country.id === countryId) {
        result = country;
      }
    });
    return result;
  }

  // 'public' methods

  createConfig() {
    const datasets = [];
    this.countries.forEach((country) => {
      if (this.defaults.includes(country.id)) {
        datasets.push(this._createChartjsDataset(country));
      }
    });

    return {
      type: 'line',
      data: {
        labels: Array.from(Array(util.getLongestPeriod(datasets)).keys()),
        datasets,
      },
      options: {
        responsive: true,
        title: { display: false },
        tooltips: { mode: 'index', intersect: false },
        hover: { mode: 'nearest', intersect: true },
        animation: { duration: 0 },
        scales: { xAxes: [_X_AXE], yAxes: [util.yAxeLeft(this.isDaily), util.yAxeRight(this.isDaily)] },
      },
    };
  }

  generateCheckboxes(type) {
    const nodes = [];
    this.countries.forEach((country) => {
      const countryKeys = [country.id];
      if (country.tests) {
        countryKeys.push(`${country.id}-testy`);
      }
      countryKeys.forEach((countryKey) => {
        const input = document.createElement('input');
        input.setAttribute('type', 'checkbox');
        input.setAttribute('id', `${type}-${countryKey}`);
        input.setAttribute('value', countryKey);
        input.checked = this.defaults.includes(country.id);
        nodes.push(input);
        nodes.push(document.createTextNode(`${countryKey} |\n`));
        this.checkboxes.push(input);
      });
    });
    return nodes;
  }

  checkboxClick(event, chart) {
    if (event.target.checked) {
      const country = this._getCountryById(event.target.value);
      if (country) {
        const dataset = this._createChartjsDataset(country);
        if (event.target.value === dataset.label) {
          chart.data.datasets.push(dataset);
        }
      }
      if (this.colors.length === 0) {
        this._disableUnchecked();
      }
    } else {
      for (let i = 0; i < chart.data.datasets.length; i += 1) {
        if (event.target.value === chart.data.datasets[i].label) {
          this.colors.push(chart.data.datasets[i].borderColor);
          chart.data.datasets.splice(i, 1);
        }
      }
      this._enableUnchecked();
    }
    const longestPeriod = util.getLongestPeriod(chart.data.datasets);
    chart.data.labels.splice(0, chart.data.labels.length);
    chart.data.labels.push(...Array.from(Array(longestPeriod).keys()));
    chart.update();
  }

  collapseClick() {
    const content = document.getElementById(`panel-${this.canvasId}`);
    if (content.style.display === 'block') {
      content.style.display = 'none';
    } else {
      content.style.display = 'block';
    }
  }
}
