import 'js-joda-timezone';
import { DateTimeFormatter, LocalDate, LocalDateTime } from 'js-joda'

const _merge =  require('lodash/merge');
const __locale = require('./locale.js').default;

const __getText = function(element,binding,def) {
  let name=binding.value || element.name || element.id;
  return __locale.get(name,def);
};

export default {
  install: (app, options) => {
    if(options) __locale.setup(options);
    app.config.globalProperties.$l = __locale;
    app.$l = __locale;
    app.provide('$l',__locale);

    app.directive('locale-text', {
      mounted: function (el,binding) {
        let text = __getText(el,binding,el.innerText);
        if(text) {
          el.innerText = text;
        }
      }
    });

    app.directive('locale-title', {
      mounted: function (el,binding) {
        let text = __getText(el,binding,el.title);
        if(text) {
          el.title = text;
        }
      }
    });

    app.directive('locale-placeholder', {
      mounted: function (el,binding) {
        let text = __getText(el,binding,el.placeholder);
        if(text) {
          el.placeholder = text;
        }
      }
    });

    app.config.globalProperties.$filters = _merge(app.config.globalProperties.$filters || {}, {
      formatDate: function(value, form) {
        if (value) {
          if(value.toISOString) return LocalDate.parse(value.toISOString()).format(DateTimeFormatter.ofPattern(form || __locale.config().date.format))
          return LocalDate.parse(value).format(DateTimeFormatter.ofPattern(form || __locale.country().date.format))
        }
      },
      formatDateTime: function(value, form) {
        if (value) {
          if(value.toISOString) return LocalDateTime.parse(value.toISOString()).format(DateTimeFormatter.ofPattern(form || __locale.config().date.formatDateTime))
          return LocalDateTime.parse(value).format(DateTimeFormatter.ofPattern(form || __locale.country().date.formatDateTime))
        }
      },
      formatTime: function(value, form) {
        if (value) {
          if(value.toISOString) return LocalDateTime.parse(value.toISOString()).format(DateTimeFormatter.ofPattern(form || __locale.config().date.formatTime))
          return LocalDateTime.parse(value).format(DateTimeFormatter.ofPattern(form || __locale.country().date.formatTime))
        }
      }
    });
  }
}
