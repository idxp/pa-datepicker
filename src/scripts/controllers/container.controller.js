(function() {

  'use strict';

  angular.module('pa-datepicker').controller('DatepickerContainerCtrl',
    ['$rootScope', '$scope', 'paDatepickerConfig',
    function($rootScope, $scope, paDatepickerConfig) {

      angular.extend(this, {

        init: function() {
          this.selections = {};

          this.initToday();
          this.initCurrentPeriod();
          this.initModel();
          this.initPanels();
          this.initMonitorWatcher();
        },

        initMonitorWatcher: function() {
          $scope.$watch(function() {
            return this.ngModel;
          }.bind(this), function() {
            this.initModel();
            this.initPanels();
          }.bind(this));
        },

        initToday: function() {
          this.today = new Date();
          this.today.setHours(0, 0, 0, 0);
        },

        initPanels: function() {
          this.datePanels = [];

          var numberOfPanels = parseInt(this.getConfig('panels'), 10);
          var base = this.getPanelStart();

          for (var i = 0; i < numberOfPanels; i++) {
            this.datePanels[i] = {
              first: i === 0,
              last: i === numberOfPanels - 1,
              year: base.getFullYear(),
              month: base.getMonth() + i - numberOfPanels + 1,
            };
          }
        },

        initCurrentPeriod: function() {
          this.currentPeriod = this.currentPeriod || 'base';
        },

        initModel: function() {
          if (this.isRange() && typeof this.ngModel !== 'object') {
            this.ngModel = {};
          } else if (this.ngModel instanceof Date) {
            this.ngModel.setHours(0, 0, 0, 0);
          } else if (typeof(this.ngModel) === 'string' || this.ngModel instanceof String) {
            this.ngModel = new Date(this.ngModel);
            this.ngModel.setHours(0, 0, 0, 0);
          } else if (!this.isRange()) {
            this.ngModel = undefined;
          }
        },

        getConfig: function(config) {
          var value = this[config] || paDatepickerConfig[config];
          return value !== 'false' ? value : false;
        },

        getPanelStart: function() {
          if (this.isRange()) {
            return this.getRangePanelStart();
          } else {
            return this.ngModel || this.today;
          }
        },

        getRangePanelStart: function() {
          if (this.ngModel.base && this.ngModel.base.end instanceof Date) {
            if (this.ngModel.comparison && this.ngModel.comparison.end instanceof Date) {
              return this.getFurtherDate();
            } else {
              return this.ngModel.base.end;
            }
          } else {
            return this.today;
          }
        },

        getFurtherDate: function() {
          if (this.compare(this.ngModel.comparison.end, this.ngModel.base.end) > 0) {
            return this.ngModel.comparison.end;
          } else {
            return this.ngModel.base.end;
          }
        },

        updatePanels: function(month, $event) {
          $event.preventDefault();
          this.datePanels.forEach(function(p) { p.month += month; });
        },

        selectDate: function(date) {
          if (this.isRange()) {
            this.handleDateSelection(date);
          } else {
            this.ngModel = date;
            this.closePopup();
          }
        },

        handleDateSelection: function(date) {
          if (!this.isSelecting()) {
            this.startSelection(date);
          } else {
            this.stopSelection(date);
            this.closePopup();
          }
        },

        isSelecting: function() {
          return !!this.selections[this.currentPeriod];
        },

        startSelection: function(date) {
          this.selections[this.currentPeriod] = {
            selected: date, start: date, end: date
          };

          $rootScope.$broadcast('paDatepicker.selection.started');
        },

        previewSelection: function(date) {
          if (!this.isSelecting()) {
            return false;
          }

          var selection = this.selections[this.currentPeriod];

          if (date >= selection.selected) {
            selection.start = selection.selected;
            selection.end = date;
          } else {
            selection.start = date;
            selection.end = selection.selected;
          }
        },

        stopSelection: function(date) {
          var selection = this.selections[this.currentPeriod];

          if (date > selection.selected) {
            this.updateCurrentPeriod(selection.selected, date);
          } else {
            this.updateCurrentPeriod(date, selection.selected);
          }

          this.selections[this.currentPeriod] = null;
          $rootScope.$broadcast('paDatepicker.selection.ended');
        },

        updateCurrentPeriod: function(start, end) {
          this.ngModel[this.currentPeriod] = { start: start, end: end };
        },

        isRange: function() {
          return this.getConfig('mode') === 'range';
        },

        isDateEnabled: function(date) {
          var minDate = this.getConfig('minDate');
          var maxDate = this.getConfig('maxDate');

          if (minDate && this.compare(date, minDate) < 0) {
            return false;
          } else if (maxDate && this.compare(date, maxDate) > 0) {
            return false;
          } else {
            return true;
          }
        },

        isDateSelected: function(date) {
          if (this.isRange()) {
            return this.isDateWithinBasePeriod(date) ||
              this.isDateWithinComparisonPeriod(date);
          }

          return this.ngModel instanceof Date &&
            date.getTime() === this.ngModel.getTime();
        },

        isDateWithinBasePeriod: function(date) {
          return this.isDateWithinPeriod('base', date);
        },

        isDateWithinComparisonPeriod: function(date) {
          return this.isDateWithinPeriod('comparison', date);
        },

        isDateWithinPeriod: function(period, date) {
          if (!this.isRange()) {
            return false;
          } else if (this.isSelecting() && this.currentPeriod === period) {
            return this.isDateWithinSelection(date);
          }

          var selection = this.ngModel[period];

          if (selection && selection.start && selection.end) {
            return selection && this.compare(date, selection.start) >= 0 &&
              this.compare(date, selection.end) <= 0;
          } else {
            return false;
          }
        },

        isDateWithinSelection: function(date) {
          var selection = this.selections[this.currentPeriod];

          return selection && this.compare(date, selection.start) >= 0 &&
            this.compare(date, selection.end) <= 0;
        },

        isToday: function(date) {
          return this.compare(date, this.today) === 0;
        },

        getStartingDay: function() {
          return (parseInt(this.getConfig('startingDay'), 10) % 7) || 0;
        },

        closePopup: function() {
          if (this.popup) {
            this.popup.close();
          }
        },

        compare: function(date1, date2) {
          var subject1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
          var subject2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());

          return subject1 - subject2;
        },

      });

    }]
  );

})();
