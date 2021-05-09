import Vue from 'vue';
import moment from 'moment';

const __getText = function(element,binding,$app) {
  let name=binding.value || element.name || element.id;
  return $app.getLocaleItem(name);
};

const __locale =  require('./locale.js').default;

export default {
  install: function(Vue) {
    Object.defineProperty(Vue.prototype, '$l', { value:__locale });

    Vue.directive('locale-text', {
      inserted: function (el,binding) {
        let text = __getText(el,binding,Vue.$app);
        if(text) {
          el.innerText = text;
        }
      }
    });

    Vue.directive('locale-title', {
      inserted: function (el,binding) {
        let text = __getText(el,binding,Vue.$app);
        if(text) {
          el.title = text;
        }
      }
    });

    Vue.directive('locale-placeholder', {
      inserted: function (el,binding) {
        let text = __getText(el,binding,Vue.$app);
        if(text) {
          el.placeholder = text;
        }
      }
    });

    Vue.filter('phoneFormat', function(phone) {
      let numbers = phone.replace(/\D/g, ''),
        char = {0:'(',3:') ',6:'-'};
      phone = '';
      for (let i = 0; i < numbers.length; i++) {
        phone += (char[i]||'') + numbers[i];
      }
      return phone;
    });

    Vue.filter('phoneType', function(code) {
      switch(code) {
        case "H": return "(Home)";
        case "W": return "(Work)";
        case "M": return "(Mobile)";
        case "F": return "(Fax)";
        default:
          return "Phone";
      }
    });

    Vue.filter('formatDate', function(value, form) {
      if (value) {
        if(value.toISOString) return moment(value.toISOString()).format(form || __locale.dateFormat);
        return moment(new Date(value).toISOString()).format(form || __locale.appSettings.dateFormat);
      }
    });

    Vue.filter('formatDateTime', function(value, form) {
      if (value) {
        if(value.toISOString) return moment(value.toISOString()).format(form || __locale.datetimeFormat);
        return moment(new Date(value).toISOString()).format(form || __locale.appSettings.datetimeFormat);
      }
    });

    Vue.filter('filesize',function (bytes, precision) {
      /**
       * An array of units, starting at bytes and ending with yottabytes.
       */
      const units = ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
      // validate 'bytes'
      if (isNaN(parseFloat(bytes))) {
        return "-";
      }
      if (bytes < 1) {
        return "0 B";
      }

      // validate 'precision'
      if (isNaN(precision)) {
        precision = 1;
      }

      const unitIndex = Math.floor(Math.log(bytes) / Math.log(1000)),
        value = bytes / Math.pow(1000, unitIndex);

      return value.toFixed(precision) + " " + units[unitIndex];
    });

    Vue.filter('formatCurrency', function(value) {
      let val = (value/1).toFixed(2).replace('.', ',')
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    });

    Vue.directive('ten-focus', {
      inserted: function (el,binding) {
        let tag = el.tagName.toLocaleUpperCase();
        if(tag!=='INPUT') {
          for(let i=0;i<el.children.length;i++) {
            let tagName = el.children[i].tagName.toLocaleUpperCase();
            if(tagName==='INPUT' || tagName==='SELECT' || tagName==='LABEL' || tagName==='TEXTAREA') {
              el = el.children[i];
              break;
            }
          }
        }
        let focusDelay = binding.value * 1 || 100;
        setTimeout(function() {
          el.focus();
        }, focusDelay);
      }
    });

    Vue.prototype.$filters = Vue.options.filters;
    Vue.$filters = Vue.options.filters;

    if(1==0) { // help intellisense
      this.$l = __locale;
    }
  }
}
