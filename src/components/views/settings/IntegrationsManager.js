/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

var PropTypes = require('prop-types');

var React = require('react');
var sdk = require('../../../index');
var MatrixClientPeg = require('../../../MatrixClientPeg');
var dis = require('../../../dispatcher');

export default class IntegrationsManager extends React.PureComponent {
    static propTypes = {
        src: PropTypes.string.isRequired, // the source of the integration manager being embedded
        onFinished: PropTypes.func.isRequired, // callback when the lightbox is dismissed
    };

    // XXX: keyboard shortcuts for managing dialogs should be done by the modal
    // dialog base class somehow, surely...
    componentDidMount() {
        this.dispatcherRef = dis.register(this.onAction);
        document.addEventListener("keydown", this.onKeyDown);
    }

    componentWillUnmount() {
        dis.unregister(this.dispatcherRef);
        document.removeEventListener("keydown", this.onKeyDown);
    }

    onKeyDown = (ev) => {
        if (ev.keyCode == 27) { // escape
            ev.stopPropagation();
            ev.preventDefault();
            this.props.onFinished();
        }
    };

    onAction = (payload) => {
        if (payload.action === 'close_scalar') {
            this.props.onFinished();
        }
    };

    render() {
        return (
            <iframe src={ this.props.src }></iframe>
        );
    }
}
