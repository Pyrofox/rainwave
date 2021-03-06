var RW_TEMPLATE_NO_VALUE = "***NOVALUE***";

var RWTemplateObject = function RWObject(_c) {
    "use strict";
    this._c=_c;
    this.error = RWTemplateObject.prototype.error.bind(this);
    this.success = RWTemplateObject.prototype.success.bind(this);
};
if (typeof(RWTemplates) == "object") {
    RWTemplates.set_object(RWTemplateObject);
}

// If you want the helper functions but don't want to load all your
// templates, this quick check will give you access to the helpers.
// (it won't overwrite the original object when loading templates too, though)
if (typeof(window.RWTemplateHelpers) == "undefined") {
    window.RWTemplateHelpers = {};
}

RWTemplateHelpers.opacity = function(val, elem) {
    "use strict";
    if (val) elem.style.opacity = "1.0";
    else elem.style.opacity = "0.6";
    return RW_TEMPLATE_NO_VALUE;
};
RWTemplateHelpers.opacity_get = false;

RWTemplateHelpers.className = function(val, elem) {
    "use strict";
    elem.className = val;
    return RW_TEMPLATE_NO_VALUE;
};

RWTemplateHelpers.copyObject = function(obj) {
    var new_obj = Object.prototype.toString.call(obj) == "[object Array]" ? [] : {};
    for (var i in obj) {
        if ((i.charAt(0) == "$") || (i.charAt(0) == "_")) {
            // console.log(i + ": skipping $ or _");
        }
        else if (typeof(obj[i]) == "function") {
            // console.log(i + ": skipping function");
        }
        else if (Object.prototype.toString.call(obj[i]) == "[object Object]") {
            // console.log(i + ": diving into object");
            new_obj[i] = RWTemplateHelpers.copyObject(obj[i]);
        }
        else if (Object.prototype.toString.call(obj[i]) == "[object Array]") {
            // console.log(i + ": diving into array");
            new_obj[i] = RWTemplateHelpers.copyObject(obj[i]);
        }
        else {
            // console.log(i + ": copying");
            new_obj[i] = obj[i];
        }
    }
    return new_obj;
};

RWTemplateHelpers.array_render = function(arr, template, el, parent_context) {
    "use strict";

    if (!arr.$t) {
        arr.$t = new RWTemplateObject(arr);
    }

    var i;
    if (Object.prototype.toString.call(arr) == "[object Object]") {
        for (i in arr) {
            if (arr.hasOwnProperty(i) && (typeof(arr[i]) !== "function")) {
                template({ "key": i, "value": arr[i] }, el);
            }
        }
        return;
    }

    if (!arr._shadows) arr._shadows = [];
    arr._shadows.push({
        "arr": arr.slice(),
        "template": template,
        "el": el,
        "render_append": arr.render_append,
        "render_positions": arr.render_positions,
        "render_delete": arr.render_delete,
        "pre_append": arr.pre_append,
        "post_append": arr.post_append,
        "post_update": arr.post_update,
        "pre_update": arr.pre_update,
        "parent_context": (arr.post_append && parent_context) ? parent_context : null
    });
    if (typeof(arr.pre_update) == "function") {
        arr.pre_update(arr);
    }
    for (i = 0; i < arr.length; i++) {
        if (typeof(arr.pre_append) == "function") {
            arr.pre_append(arr[i], parent_context);
        }
        if (!arr[i].$t) {
            arr[i].$t = new RWTemplateObject(arr[i]);
        }
        if (typeof(arr.render_append) == "function") {
            template(arr[i], null, i);
            arr.render_append(el, arr[i]);
        }
        else {
            arr[i].$t.__i = i;
            template(arr[i], el, i);
            if (!arr[i].$t.item_root) {
                throw("Array rendered without item_root element.");
            }
        }
        if (typeof(arr.post_append) == "function") {
            arr.post_append(arr[i], parent_context);
        }
    }
    if (typeof(arr.post_update) == "function") {
        arr.post_update(arr);
    }
};

RWTemplateHelpers.array_item_delete = function(container_el, deleted_array_item) {
    "use strict";
    if (deleted_array_item.$t && deleted_array_item.$t.item_root) {
        for (var i = 0; i < deleted_array_item.$t.item_root.length; i++) {
            if (deleted_array_item.$t.item_root[i].parentNode == container_el) {
                container_el.removeChild(deleted_array_item.$t.item_root[i]);
            }
        }
    }
    else {
        console.warn("Cannot delete array item from page - make sure your template has a bind='item_root' inside the {{#each}} block if you want to enable automatic HTML element removal.");
    }
};

RWTemplateHelpers.array_update = function(arr, full_render) {
    "use strict";
    if (!arr._shadows) return;

    var shadow;
    for (var s = 0; s < arr._shadows.length; s++) {
        shadow = arr._shadows[s];

        if (typeof(shadow.pre_update) == "function") {
            shadow.pre_update(arr);
        }

        // find things that no longer exist
        var exists, i, j;
        var anything_changed;
        for (i = shadow.arr.length -1; i >= 0; i--) {
            exists = arr.indexOf(shadow.arr[i]);
            if (exists === -1) {
                anything_changed = true;
                (shadow.render_delete || arr.render_delete || RWTemplateHelpers.array_item_delete)(shadow.el, shadow.arr[i]);
            }
        }

        // find things that don't exist yet
        for (i = 0; i < arr.length; i++) {
            exists = shadow.arr.indexOf(arr[i]);
            if (exists === -1) {
                anything_changed = true;
                if (shadow.pre_append) {
                    shadow.pre_append(arr[i], shadow.parent_context);
                }
                if (!arr[i].$t) {
                    arr[i].$t = new RWTemplateObject(arr[i]);
                }
                if (arr._preserve_item_roots && arr[i].$t && arr[i].$t.item_root && arr[i].$t.item_root.length) {
                    shadow.el.appendChild(arr[i].$t.item_root[0]);
                }
                else if (shadow.template) {
                    arr[i].$t.__i = i;
                    shadow.template(arr[i], shadow.el);
                }
                if (shadow.render_append) {
                    shadow.render_append(shadow.el, arr[i]);
                }
                if (shadow.post_append) {
                    shadow.post_append(arr[i], shadow.parent_context);
                }
            }
            else if (exists !== i) {
                anything_changed = true;
            }
        }

        shadow.arr = arr.slice();

        if (full_render) {
            for (i = 0; i < arr.length; i++) {
                if (arr[i].$t) {
                    arr[i].$t.update();
                }
            }
        }

        if (anything_changed) {
            if (shadow.render_positions) {
                shadow.render_positions();
            }
            else if (arr.length > 0 && arr[0].$t.item_root) {
                for (i = 0; i < arr.length; i++) {
                    for (j = 0; j < arr[i].$t.item_root.length; j++) {
                        if (arr[i].$t.item_root[j].parentNode) {
                            arr[i].$t.item_root[j].parentNode.appendChild(arr[i].$t.item_root[j]);
                        }
                    }
                }
            }
            else if (arr.length > 0) {
                console.warn("Array can't be updated with correct HTML sorting - make sure your array item templates have bind='item_root' to enable automatic HTML element position sorting.");
            }
        }

        if (typeof(shadow.post_update) == "function") {
            shadow.post_update(arr);
        }
    }
};

RWTemplateHelpers.elem_update = function(elem, val) {
    "use strict";
    if (typeof(val) == "undefined") return;
    if (typeof(elem) != "object") return;
    if (!elem.getAttribute) return;
    var elem_val = val;
    var tagname = elem.tagName.toLowerCase();
    if (elem.getAttribute("helper")) {
        var hname = elem.getAttribute("helper");
        if (!RWTemplateHelpers[hname]) {
            throw("Helper " + hname + " doesn't exist.");
        }
        elem_val = RWTemplateHelpers[hname](val, elem);
        if (elem_val === RW_TEMPLATE_NO_VALUE) return;
    }
    if (tagname == "select") {
        elem.value = val;
    }
    else if (tagname == "input") {
        if (elem.getAttribute("type") == "radio") {
            if (elem.getAttribute("value") == val) {
                elem.checked = true;
            }
            else {
                elem.checked = false;
            }
        }
        else if (elem.getAttribute("type") == "checkbox") {
            if (val) {
                elem.checked = true;
            }
            else {
                elem.checked = false;
            }
        }
        else if (document.activeElement != elem) {
            elem.value = elem_val;
        }
    }
    else if ((tagname == "textarea") && (document.activeElement != elem)) {
        if (elem.value != elem_val) {
            elem.value = elem_val;
        }
    }
    else if (tagname == "img") {
        elem.setAttribute("src", elem_val);
    }
    else {
        elem.textContent = elem_val || "";
    }
};

RWTemplateHelpers.change_button_text = function(btn, text) {
    if (btn._no_changes_please) return;
    if (!btn._changed) {
        btn._changed = true;
        //btn.style.minWidth = btn.offsetWidth + "px";
        btn._original_html = btn.innerHTML;
    }
    if (!text && btn._original_html) {
        btn.innerHTML = btn._original_html;
    }
    else if (text) {
        btn.textContent = text;
    }
};

RWTemplateHelpers.stop_ie8_propagation = function(e) {
    e = e || window.event;
    e.cancelBubble = true;
    e.returnValue = false;
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
    return e;
};

RWTemplateHelpers.tabify = function(obj, def) {
    if (!obj.$t) return;
    var areas = [];
    var tabs = [];
    var hide_areas = function() {
        for (var i = 0; i < areas.length; i++) {
            areas[i].classList.add("tab_invisible");
        }
        for (i = 0; i < tabs.length; i++) {
            tabs[i].parentNode.classList.remove("active");
        }
    };
    for (var i in obj.$t) {
        if ((i.indexOf("_area") !== -1) && (i.indexOf("_area") == (i.length - 5))) {
            areas.push(obj.$t[i][0]);
            obj.$t[i][0].classList.add("tab_area");
            obj.$t[i][0].classList.add("tab_invisible");
        }
        else if ((i.indexOf("_tab") !== -1) && (i.indexOf("_tab") == (i.length - 4))) {
            tabs.push(obj.$t[i][0]);
            obj.$t[i][0]._tab_name = i.substr(0, i.indexOf("_tab"));
            obj.$t[i][0]._open = function() {
                hide_areas();
                this.parentNode.classList.add("active");
                if (obj.$t[this._tab_name + "_area"] && obj.$t[this._tab_name + "_area"][0]) {
                    obj.$t[this._tab_name + "_area"][0].classList.remove("tab_invisible");
                }
                else {
                    throw("Can't find corresponding area for " + this._tab_name + ".  Make sure you have a " + this._tab_name + "_area bound.");
                }
            };
            obj.$t[i][0].addEventListener("click", obj.$t[i][0]._open);
        }
    }
    hide_areas();
    if (def) {
        obj.$t[def + "_area"][0].classList.remove("tab_invisible");
        obj.$t[def + "_tab"][0].parentNode.classList.add("active");
    }
};

(function() {
    "use strict";

    var autosave_timeouts = {};

    var setup_timeout = function(element, template_obj) {
        element.addEventListener("input", function() {
            if (autosave_timeouts[template_obj]) {
                clearTimeout(autosave_timeouts[template_obj]);
            }
            autosave_timeouts[template_obj] = setTimeout((template_obj.on_autosave || template_obj.on_submit), 2000);
        });
    };

    var setup_autosave = function(element, template_obj) {
        element.addEventListener("change", function() {
            if (autosave_timeouts[template_obj]) {
                clearTimeout(autosave_timeouts[template_obj]);
                autosave_timeouts[template_obj] = null;
            }
            var was_changed = template_obj.get(false, true);
            var has_changed;
            for (var i in was_changed) {
                if (was_changed.hasOwnProperty(i)) {
                    has_changed = true;
                    break;
                }
            }
            if (has_changed) {
                (template_obj.on_autosave || template_obj.on_submit)();
            }
        });
    };

    RWTemplateObject.prototype.enable_auto_save = function() {
        if (!this.on_submit && !this.on_autosave) {
            throw("$t.on_submit or $t.on_autosave must be defined before calling enable_auto_save.");
        }
        var elements = this.get_form_elements();
        for (var i = 0; i < elements.length; i++) {
            if (!elements[i]._autosaving) {
                if ((elements[i].tagName == "TEXTAREA") || ((elements[i].tagName == "INPUT") && (elements[i].getAttribute("type") == "text"))) {
                    setup_timeout(elements[i], this);
                }
                setup_autosave(elements[i], this);
                elements[i]._autosaving = true;
            }
        }
    };

    var stop_button = function(e) {
        //e.stopPropagation();
        e.preventDefault();
    };

    RWTemplateHelpers.on_form_render = function(_c, form) {
        if (!_c.$t) return;

        var track_last_button = function(e) {
            _c.$t._last_button = this;
        };

        form.onsubmit = function(e) {
            if (autosave_timeouts[_c.$t]) {
                clearTimeout(autosave_timeouts[_c.$t]);
                autosave_timeouts[_c.$t] = null;
            }
            e = RWTemplateHelpers.stop_ie8_propagation(e);
            if (_c.$t && _c.$t.on_submit) {
                _c.$t.on_submit();
            }
            return false;
        };
        var nodes = form.querySelectorAll("button");
        for (var i = 0; i < nodes.length; i++) {
            if (!nodes[i].getAttribute("type") || (nodes[i].getAttribute("type") != "submit")) {
                nodes[i].addEventListener("click", stop_button);
            }
            else if (nodes[i].getAttribute("type") == "submit") {
                nodes[i].addEventListener("click", track_last_button);
            }
        }
    };
    RWTemplateHelpers._ofr = RWTemplateHelpers.on_form_render;

    var btn_success = "btn-success";
    var btn_error = "btn-danger";
    var btn_normal = "btn-primary";
    var error_class = "has-error";

    var bootstrap_mode = true;

    RWTemplateHelpers.remove_error_class = function(elem) {
        elem = elem.classList ? elem : this;
        if (!elem.classList) return;
        if (elem.classList.contains(error_class)) {
            elem.classList.remove(btn_error);
        }
        if (bootstrap_mode && !elem.classList.contains("form-group")) {
            while (elem.parentNode && elem.parentNode.classList) {
                if (elem.parentNode.classList.contains("form-group")) {
                    elem.parentNode.classList.remove(error_class);
                    break;
                }
                elem = elem.parentNode;
            }
        }
    };
    RWTemplateHelpers._rec = function(elem) {
        elem.addEventListener("focus", RWTemplateHelpers.remove_error_class);
    };

    RWTemplateHelpers.add_error_class = function(elem) {
        elem = elem.classList ? elem : this;
        if (!elem.classList) return;
        if (elem.classList.contains(error_class)) {
            elem.classList.remove(error_class);
        }
        if (bootstrap_mode && !elem.classList.contains("form-group")) {
            while (elem.parentNode && elem.parentNode.classList) {
                if (elem.parentNode.classList.contains("form-group")) {
                    elem.parentNode.classList.add(error_class);
                    break;
                }
                elem = elem.parentNode;
            }
        }
    };

    RWTemplateHelpers.change_button_class = function(btn, new_class) {
        btn.classList.remove(btn_success);
        btn.classList.remove(btn_error);
        btn.classList.remove(btn_normal);
        if (new_class == btn._normal_class) {
            btn.classList.remove(btn._normal_class);
        }
        btn.classList.add(new_class);
    };

    RWTemplateObject.prototype.update = function(from_object) {
        if (Object.prototype.toString.call(this._c) == "[object Array]") {
            return RWTemplateHelpers.array_update(this._c);
        }

        var val;
        from_object = from_object || this._c;
        for (var i in from_object) {
            if (!from_object.hasOwnProperty(i)) continue;
            if (i.charAt(0) == "$") continue;

            val = from_object[i];
            if (Object.prototype.toString.call(val) == "[object Array]") {
                RWTemplateHelpers.array_update(val, true);
            }
            else if ((Object.prototype.toString.call(val) == "[object Object]") && val.$t) {
                if (val.$t instanceof RWTemplateObject) {
                    val.$t.update();
                }
                else {
                    throw("$t is not an RWTemplateObject.");
                }
            }
            else if (typeof(this[i]) == "function") {
                this[i](val);
            }
            else if (typeof(this[i]) == "object") {
                for (var eli = 0; eli < this[i].length; eli++) {
                    RWTemplateHelpers.elem_update(this[i][eli], val);
                }
            }
        }
    };

    RWTemplateObject.prototype.get = function(update_in_place, only_diff, shallow) {
        var new_obj = {};
        var arr_i, ii;
        for (var i in this._c) {
            if (!this._c.hasOwnProperty(i)) continue;
            if (i.charAt(0) == "$") continue;

            if ((Object.prototype.toString.call(this._c[i]) == "[object Array]") && !shallow) {
                var new_arr = [];
                for (arr_i = 0; arr_i < this._c[i].length; arr_i++) {
                    if (this._c[i][arr_i] && this._c[i][arr_i].$t && this._c[i][arr_i].$t.get) {
                        new_arr.push(this._c[i][arr_i].$t.get(update_in_place, only_diff));
                    }
                }
                if (new_arr.length) {
                    new_obj[i] = new_arr;
                }
            }
            else if ((this._c[i] !== null) && (this._c[i] !== undefined) && this._c[i].$t && this._c[i].$t.get && !shallow) {
                var new_sub_obj = this._c[i].$t.get(update_in_place, only_diff);
                for (ii in new_sub_obj) {
                    if (new_sub_obj.hasOwnProperty(ii)) {
                        new_obj[i] = new_sub_obj;
                        break;
                    }
                }
            }
            else if (this[i]) {
                var elem, tagname, new_val;
                for (var eli = 0; eli < this[i].length; eli++) {
                    new_val = undefined;
                    elem = this[i][eli];
                    if (typeof(elem) == "function") continue;
                    tagname = elem.nodeType && elem.tagName ? elem.tagName.toLowerCase() : null;
                    if (tagname == "select") {
                        new_val = elem.value;
                    }
                    else if ((tagname == "input") && (elem.getAttribute("type") == "radio")) {
                        if (elem.checked) {
                            new_val = elem.value;
                        }
                    }
                    else if ((tagname == "input") && (elem.getAttribute("type") == "checkbox")) {
                        if (elem.checked) {
                            if (elem.getAttribute("value")) {
                                new_val = elem.getAttribute("value");
                            }
                            else {
                                new_val = true;
                            }
                        }
                        else {
                            new_val = null;
                        }
                    }
                    else if ((elem.getAttribute("type") != "submit") && (typeof(elem.value) != "undefined") && (tagname != "li")) {
                        new_val = elem.value;
                    }

                    if ((typeof(new_val) != "undefined") && elem.getAttribute("helper")) {
                        if (typeof(RWTemplateHelpers[elem.getAttribute("helper") + "_get"]) == "function") {
                            new_val = RWTemplateHelpers[elem.getAttribute("helper") + "_get"](this._c, new_val);
                        }
                        else if (typeof(RWTemplateHelpers[elem.getAttribute("helper") + "_get"]) == "undefined") {
                            console.warn("Helper " + elem.getAttribute("helper") + " has a setter but no getter (value " + new_val + ").  Define RWTemplateHelpers." + elem.getAttribute("helper") + "_get.");
                        }
                    }

                    if (typeof(new_val) != "undefined") {
                        if (elem.hasAttribute("int") && !isNaN(new_val) && !isNaN(parseInt(new_val))) {
                            new_val = parseInt(new_val);
                        }
                        else if (elem.hasAttribute("float") && !isNaN(new_val) && !isNaN(parseFloat(new_val))) {
                            new_val = parseFloat(new_val);
                        }
                        if ((!only_diff && (typeof(new_obj[i]) == "undefined")) || (new_val != this._c[i])) {
                            new_obj[i] = new_val;
                        }
                    }
                }
            }
        }

        return new_obj;
    };

    RWTemplateHelpers.array_reconcile = function(fresh, existing) {
        if (!existing._unique_field && !existing._update_in_order && !existing._exact_match) {
            // console.warn("Array that we're trying to update does not have a _unique_field property.");
            // console.warn(existing);
            return;
        }
        var i, j, found;
        if (existing._update_in_order) {
            for (i = 0; i < Math.min(fresh.length, existing.length); i++) {
                if (existing[i] && existing[i].$t) {
                    existing[i].$t.update_data(fresh[i]);
                }
                else {
                    existing[i] = fresh[i];
                }
            }
            for (i = existing.length; i < fresh.length; i++) {
                existing.push(fresh[i]);
            }
            while (existing.length > fresh.length) {
                existing.pop();
            }
        }
        else if (existing._exact_match) {
            for (j = existing.length - 1; j >= 0; j--) {
                found = false;
                for (i = fresh.length - 1; i >= 0; i--) {
                    if (fresh[i] === existing[j]) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    existing.splice(j, 1);
                }
            }
            for (i = fresh.length - 1; i >= 0; i--) {
                found = false;
                for (j = existing.length - 1; j >= 0; j--) {
                    if (fresh[i] === existing[j]) {
                        found = true;
                    }
                }
                if (!found) {
                    if (i < existing.length) {
                        existing.splice(i, 0, fresh[i]);
                    }
                    else {
                        existing.push(fresh[i]);
                    }
                }
            }
        }
        else {
            for (j = existing.length - 1; j >= 0; j--) {
                found = false;
                for (i = fresh.length - 1; i >= 0; i--) {
                    if (fresh[i][existing._unique_field] == existing[j][existing._unique_field]) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    existing.splice(j, 1);
                }
            }

            for (i = fresh.length - 1; i >= 0; i--) {
                found = false;
                for (j = existing.length - 1; j >= 0; j--) {
                    if (fresh[i][existing._unique_field] == existing[j][existing._unique_field]) {
                        if (existing[j].$t) {
                            existing[j].$t.update_data(fresh[i]);
                        }
                        else {
                            existing[j] = fresh[i];
                        }
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    if (i < existing.length) {
                        existing.splice(i, 0, fresh[i]);
                    }
                    else {
                        existing.push(fresh[i]);
                    }
                }
            }

            var map = {};
            for (i = 0; i < existing.length; i++) {
                map[existing[i][existing._unique_field]] = existing[i];
            }
            for (i = 0; i < fresh.length; i++) {
                if (existing[i][existing._unique_field] != fresh[i][existing._unique_field]) {
                    existing[i] = map[fresh[i][existing._unique_field]];
                }
            }
        }
    };

    RWTemplateObject.prototype.update_data = function(new_data) {
        var new_obj = new_data || this.get();
        if (Object.prototype.toString.call(this._c) == "[object Array]") {
            if (new_obj) {
                RWTemplateHelpers.array_reconcile(new_obj, this._c);
            }
            return RWTemplateHelpers.array_update(this._c);
        }
        for (var i in new_obj) {
            if (!new_obj.hasOwnProperty(i)) {
                // do nothing
            }
            else if (i.charAt(0) == "$") {
                // do nothing
            }
            else if (this._c[i] && ((Object.prototype.toString.call(this._c[i]) == "[object Array]") || (Object.prototype.toString.call(new_obj[i]) == "[object Array]"))) {
                if (Object.prototype.toString.call(this._c[i]) === Object.prototype.toString.call(new_obj[i])) {
                    RWTemplateHelpers.array_reconcile(new_obj[i], this._c[i]);
                }
                else {
                    console.warn("Mismatching object and error when updating object (new, old, key):");
                    console.warn(new_obj, this._c, i);
                }
            }
            else if ((typeof(this._c[i]) == "object") && this._c[i] && this._c[i].$t) {
                this._c[i].$t.update_data(new_obj[i]);
            }
            else {
                this._c[i] = new_obj[i];
            }
        }
    };

    RWTemplateObject.prototype.reset = function() {
        this.normal();
        RWTemplateObject.prototype.update();
    };

    var allowed_tags = [ "select", "button", "textarea", "input" ];

    RWTemplateObject.prototype.get_form_elements = function() {
        var elements = [];
        var i, j;
        for (i in this) {
            if (!this.hasOwnProperty(i)) continue;
            if (i.charAt(0) == "$") continue;
            if (i == "_c") continue;
            if (this[i] && this[i]._no_save_propagation) continue;

            if (Object.prototype.toString.call(this[i]) == "[object Array]") {
                for (j = 0; j < this[i].length; j++) {
                    if (typeof(this[i][j]) == "object") {
                        if (allowed_tags.indexOf(this[i][j].tagName.toLowerCase()) !== -1) {
                            elements.push(this[i][j]);
                        }
                    }
                }
            }
        }
        for (i in this._c) {
            if (!this._c.hasOwnProperty(i)) continue;
            if (i.charAt(0) == "$") continue;
            if (!this._c[i]) continue;
            if (this._c[i]._no_save_propagation) continue;

            if ((typeof(this._c[i].$t) != "undefined") && this._c[i].$t._c && (this._c[i].$t._c != this._c)) {
                elements = elements.concat(this._c[i].$t.get_form_elements());
            }
            else if (Object.prototype.toString.call(this._c[i]) == "[object Array]") {
                for (j = 0; j < this._c[i].length; j++) {
                    if (typeof(this._c[i][j].$t) != "undefined") {
                        elements = elements.concat(this._c[i][j].$t.get_form_elements());
                    }
                }
            }
        }
        return elements;
    };

    RWTemplateObject.prototype.clear = function() {
        var elements = this.normal();
        for (var i = 0; i < elements.length; i++) {
            elements[i].value = null;
        }
    };

    RWTemplateObject.prototype.submitting = function(submit_message, no_disable) {
        var elements = this.normal();
        for (var i = 0; i < elements.length; i++) {
            if (((elements[i].getAttribute("type") == "submit") && !this._last_button) || (elements[i] == this._last_button)) {
                RWTemplateHelpers.change_button_text(elements[i], submit_message || (typeof(gettext) == "function" ? gettext("Saving...") : "Saving..."));
                if (!no_disable) {
                    RWTemplateHelpers.change_button_class(elements[i], elements[i]._normal_class || btn_normal);
                }
            }
            if (!no_disable) {
                elements[i].disabled = true;
                elements[i].classList.add("disabled");
            }
        }
    };

    var tracking_errors = {};

    RWTemplateObject.prototype.error = function(rest_error, xhr_object, error_message) {
        if (xhr_object) {
            if (xhr_object.status === 403) {
                error_message = typeof(gettext) == "function" ? gettext("Invalid Permissions") : "Invalid Permissions";
            }
            else if ((xhr_object.status % 300) < 100) {
                error_message = typeof(gettext) == "function" ? gettext("Server Error (300)") : "Server Error (300)";
            }
            else if ((xhr_object.status % 500) < 100) {
                error_message = typeof(gettext) == "function" ? gettext("Server Error (500)") : "Server Error(500)";
            }
        }
        if (rest_error && rest_error.detail) {
            error_message = error_message || rest_error.detail;
        }
        error_message = error_message || (typeof(gettext) == "function" ? gettext("Try Again") : "Try Again");

        var elements = this.normal();
        var submit_btns = [];
        for (var i = 0; i < elements.length; i++) {
            if (this._c.hasOwnProperty(i)) RWTemplateHelpers.remove_error_class(elements[i]);
            if (elements[i].getAttribute("disabled") != "always") {
                elements[i].disabled = false;
                elements[i].classList.remove("disabled");
            }
            if (((elements[i].getAttribute("type") == "submit") && !this._last_button) || (elements[i] == this._last_button)) {
                submit_btns.push(elements[i]);
            }
        }

        if (submit_btns.length) {
            for (i = 0; i < submit_btns.length; i++) {
                RWTemplateHelpers.change_button_text(submit_btns[i], error_message);
                RWTemplateHelpers.change_button_class(submit_btns[i], btn_error);
            }

            tracking_errors[submit_btns[0]] = function() {
                for (i = 0; i < submit_btns.length; i++) {
                    RWTemplateHelpers.change_button_text(submit_btns[i]);
                    RWTemplateHelpers.change_button_class(submit_btns[i], btn_normal);
                }

                for (i = 0; i < elements.length; i++) {
                    elements[i].removeEventListener("focus", tracking_errors[submit_btns[0]]);
                }
                tracking_errors[submit_btns[0]] = null;
            };

            for (i = 0; i < elements.length; i++) {
                elements[i].addEventListener("focus", tracking_errors[submit_btns[0]]);
            }
        }

        if (rest_error) {
            var eli;
            for (i in rest_error) {
                if (this._c[i] && this._c[i].$t && (Object.prototype.toString.call(this._c[i]) == "[object Array]") && (Object.prototype.toString.call(rest_error[i]) == "[object Array]")) {
                    if (!this._c[i]._no_save_propagation) {
                        for (eli = 0; eli < rest_error[i].length && eli < this._c[i].length; eli++) {
                            this._c[i][eli].$t.error(rest_error[i][eli], xhr_object, error_message);
                        }
                    }
                }
                else if ((typeof(this._c[i]) == "object") && this._c[i] && this._c[i].$t && !this._c[i]._no_save_propagation) {
                    this._c[i].$t.error(rest_error[i], xhr_object, error_message);
                }
                else if (this.hasOwnProperty(i)) {
                    for (eli = 0; eli < this[i].length; eli++) {
                        RWTemplateHelpers.add_error_class(this[i][eli]);
                    }
                }
            }
        }
    };

    RWTemplateObject.prototype.normal = function(submit_button_text) {
        var elements = this.get_form_elements();
        for (var i = 0; i < elements.length; i++) {
            RWTemplateHelpers.remove_error_class(elements[i]);
            elements[i].disabled = false;
            elements[i].classList.remove("disabled");
            if (elements[i].getAttribute("type") == "submit") {
                RWTemplateHelpers.change_button_text(elements[i], submit_button_text);
                RWTemplateHelpers.change_button_class(elements[i], btn_normal);
            }
        }
        return elements;
    };

    RWTemplateObject.prototype.success_display = function(success_message, permanent) {
        var elements = this.normal();
        var this_obj, normalize;
        if (!permanent) {
            this_obj = this;
            normalize = function() {
                this_obj._success_timeout = null;
                this_obj.normal();
            };
        }
        for (var i = 0; i < elements.length; i++) {
            elements[i].disabled = permanent;
            elements[i].classList[permanent ? "add" : "remove"]("disabled");
            if (((elements[i].getAttribute("type") == "submit") && !this._last_button) || (elements[i] == this._last_button)) {
                RWTemplateHelpers.change_button_text(elements[i], success_message || this._success_message || this._c._success_message || (typeof(gettext) == "function" ? gettext("Saved") : "Saved"));
                RWTemplateHelpers.change_button_class(elements[i], btn_success);
                if (!permanent) {
                    if (this._success_timeout) {
                        clearTimeout(this._success_timeout);
                        this._success_timeout = null;
                    }
                    this._success_timeout = setTimeout(normalize, 2000);
                }
            }
        }
    };

    RWTemplateObject.prototype.success = function(json, xhr_object) {
        this.update_data(json);
        this.update();
        this.success_display();
    };
}());
