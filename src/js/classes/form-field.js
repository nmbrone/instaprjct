// as example
// const EMAIL_RE = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i;


const FormField = (function() {

  const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  const NUMBER_RE = /^[\-\+]?(\d+|\d+\.?\d+)$/;

  const RULE_PARAM_RE = /\[.*\]$/; // match 'ruleName[param1, param2]'

  const parseRule = (str) => {
    const match = str.match(RULE_PARAM_RE);
    const name = str.replace(RULE_PARAM_RE, '');
    const params = match ? match[0].slice(1, -1).split(',').filter(p => !!p) : [];
    return { name, params };
  };

  window.parse = parseRule;

  const messages = {
    email: 'Email is not valid',
    minLength: 'Value must contain at least {n} characters',
    maxLength: 'Value can\'t contain more than {n} characters',
    required: 'Field is required',
  };

  const validator = {
    email: (s) => EMAIL_RE.test(s) || messages.email,
    minLength: (s, len = 6) => s.length >= len || messages.minLength.replace('{n}', len),
    maxLength: (s, len = 100) => s.length <= len || messages.maxLength.replace('{n}', len),
    required: (s) => !!s.length || messages.required,
  };

  class FormField {
    constructor(element, props = {}) {
      this.element   = isDomElement(element) ? element : qs(element);
      this.props     = Object.assign({}, FormField.defaults, props);
      this._isValid  = null;
      this._hasError = null;

      if (this.element.matches(this.props.control)) {
        this.control = this.element;
      } else {
        this.control = qs(this.props.control, this.element);
      }

      if (this.control !== this.element) {
        this._setupErrorElement();
      }

      this._setupValidator();
      this.validate = this.validate.bind(this);
      this._bindEvents();

      console.log(this);
    }

    validate() {
      const result = this._validator(this.control.value);
      this._resetState();

      if (result === true) {
        this._setValidState();
      } else {
        this._setErrorState(result);
      }
    }

    _setErrorState(message) {
      this.errorMessages = [].concat(message);
      this.element.classList.add(this.props.errorClass);
      this.element.appendChild(this.errorElement);
      if (this.errorElement) this.errorElement.innerHTML = this.errorMessages.join('<br>');
      this._hasError = true;
    }

    _setValidState() {
      this.element.classList.add(this.props.validClass);
      this._isValid = true;
    }

    _resetState() {
      if (this._isValid === null && this._hasError === null) return;

      const { errorClass, validClass } = this.props;
      this.element.classList.remove(errorClass);
      this.element.classList.remove(validClass);

      // unmount error element if mounted
      if (this.errorElement && this.errorElement.parentNode) {
        this.errorElement.innerHTML = '';
        this.element.removeChild(this.errorElement);
      }

      this.errorMessages = [];

      this._isValid = null;
      this._hasError = null;
    }

    _setupErrorElement() {
      if (this.errorElement) return;
      this.errorElement = document.createElement('span');
      this.errorElement.className = this.props.errorElementClass;
    }

    _bindEvents() {
      const { resetOnFocus, validateOnInput, validateOnBlur } = this.props;

      if (resetOnFocus) {
        this.control.addEventListener('focus', () => this._resetState());
      }

      if (validateOnInput) {
        this.control.addEventListener('input', this.validate);
      }

      if (validateOnBlur) {
        this.control.addEventListener('blur', this.validate);
      }
    }

    _setupValidator() {
      const { validate, customValidator } = this.props;
      const type = typeof validate;
      let rules  = [];
      let fns    = [];

      if (typeof customValidator === 'function') {
        fns.push(customValidator);
      }

      if (type === 'string' || Array.isArray(validate)) {
        rules = rules.concat(validate);
      }

      rules.forEach(rule => {
        const { name, params } = parseRule(rule);
        const fn = validator[name];
        if (fn) {
          fns.push(fn.bind(undefined, ...params));
          // fns.push(() => fn.apply(undefined, params));
        }
      });

      // if "customValidator" is not a function or "validate" has unknown value
      if (!fns.length) {
        throw new Error(
          'You must provide "validate" or "customValidator" option for FormField class.'
        );
      }

      this._rules = fns;

      this._validator = (value) => {
        const results = this._rules.map(fn => fn(value));
        const valid = results.every(res => res === true);
        return valid || results.filter(res => typeof res !== 'boolean');
      };
    }

  }

  FormField.defaults = {
    errorClass: 'has-error',
    validClass: 'has-success',
    errorElementClass: 'text-danger',
    resetOnFocus: true,
    validateOnInput: false,
    validateOnBlur: true,
    control: 'input',
    customValidator: null,
    validate: 'required'
  };

  return FormField;

} ());

setTimeout(() => {
  new FormField('#public-info .form-group', {
    validate: ['required', 'email']
  });
}, 1000);
