/*
Copyright 2017 New Vector Ltd

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

import PropTypes from 'prop-types';
import React from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import dis from '../../../dispatcher';
import Modal from '../../../Modal';
import sdk from '../../../index';
import { _t } from '../../../languageHandler';
import GroupStore from '../../../stores/GroupStore';

module.exports = class extends React.Component {
    static displayName = 'GroupRoomInfo';

    static contextTypes = {
        matrixClient: PropTypes.instanceOf(MatrixClient),
    };

    static propTypes = {
        groupId: PropTypes.string,
        groupRoomId: PropTypes.string,
    };

    state = {
        isUserPrivilegedInGroup: null,
        groupRoom: null,
        groupRoomPublicityLoading: false,
        groupRoomRemoveLoading: false,
    };

    componentWillMount() {
        this._initGroupStore(this.props.groupId);
    }

    componentWillReceiveProps(newProps) {
        if (newProps.groupId !== this.props.groupId) {
            this._unregisterGroupStore(this.props.groupId);
            this._initGroupStore(newProps.groupId);
        }
    }

    componentWillUnmount() {
        this._unregisterGroupStore(this.props.groupId);
    }

    _initGroupStore = (groupId) => {
        GroupStore.registerListener(groupId, this.onGroupStoreUpdated);
    };

    _unregisterGroupStore = (groupId) => {
        GroupStore.unregisterListener(this.onGroupStoreUpdated);
    };

    _updateGroupRoom = () => {
        this.setState({
            groupRoom: GroupStore.getGroupRooms(this.props.groupId).find(
                (r) => r.roomId === this.props.groupRoomId,
            ),
        });
    };

    onGroupStoreUpdated = () => {
        this.setState({
            isUserPrivilegedInGroup: GroupStore.isUserPrivileged(this.props.groupId),
        });
        this._updateGroupRoom();
    };

    _onRemove = (e) => {
        const groupId = this.props.groupId;
        const roomName = this.state.groupRoom.displayname;
        e.preventDefault();
        e.stopPropagation();
        const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
        Modal.createTrackedDialog('Confirm removal of group from room', '', QuestionDialog, {
            title: _t("Are you sure you want to remove '%(roomName)s' from %(groupId)s?", {roomName, groupId}),
            description: _t("Removing a room from the community will also remove it from the community page."),
            button: _t("Remove"),
            onFinished: (proceed) => {
                if (!proceed) return;
                this.setState({groupRoomRemoveLoading: true});
                const groupId = this.props.groupId;
                const roomId = this.props.groupRoomId;
                GroupStore.removeRoomFromGroup(this.props.groupId, roomId).then(() => {
                    dis.dispatch({
                        action: "view_group_room_list",
                    });
                }).catch((err) => {
                    console.error(`Error whilst removing ${roomId} from ${groupId}`, err);
                    const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                    Modal.createTrackedDialog('Failed to remove room from group', '', ErrorDialog, {
                        title: _t("Failed to remove room from community"),
                        description: _t(
                            "Failed to remove '%(roomName)s' from %(groupId)s", {groupId, roomName},
                        ),
                    });
                }).finally(() => {
                    this.setState({groupRoomRemoveLoading: false});
                });
            },
        });
    };

    _onCancel = (e) => {
        dis.dispatch({
            action: "view_group_room_list",
        });
    };

    _changeGroupRoomPublicity = (e) => {
        const isPublic = e.target.value === "public";
        this.setState({
            groupRoomPublicityLoading: true,
        });
        const groupId = this.props.groupId;
        const roomId = this.props.groupRoomId;
        const roomName = this.state.groupRoom.displayname;
        GroupStore.updateGroupRoomVisibility(this.props.groupId, roomId, isPublic).catch((err) => {
            console.error(`Error whilst changing visibility of ${roomId} in ${groupId} to ${isPublic}`, err);
            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            Modal.createTrackedDialog('Failed to remove room from group', '', ErrorDialog, {
                title: _t("Something went wrong!"),
                description: _t(
                    "The visibility of '%(roomName)s' in %(groupId)s could not be updated.",
                    {roomName, groupId},
                ),
            });
        }).finally(() => {
            this.setState({
                groupRoomPublicityLoading: false,
            });
        });
    };

    render() {
        const BaseAvatar = sdk.getComponent('avatars.BaseAvatar');
        const EmojiText = sdk.getComponent('elements.EmojiText');
        const AccessibleButton = sdk.getComponent('elements.AccessibleButton');
        const InlineSpinner = sdk.getComponent('elements.InlineSpinner');
        const GeminiScrollbarWrapper = sdk.getComponent("elements.GeminiScrollbarWrapper");
        if (this.state.groupRoomRemoveLoading || !this.state.groupRoom) {
            const Spinner = sdk.getComponent("elements.Spinner");
            return <div className="mx_MemberInfo">
                <Spinner />
            </div>;
        }

        let adminTools;
        if (this.state.isUserPrivilegedInGroup) {
            adminTools =
                <div className="mx_MemberInfo_adminTools">
                    <h3>{ _t("Admin Tools") }</h3>
                    <div className="mx_MemberInfo_buttons">
                        <AccessibleButton className="mx_MemberInfo_field" onClick={this._onRemove}>
                            { _t('Remove from community') }
                        </AccessibleButton>
                    </div>
                    <h3>
                        { _t('Visibility in Room List') }
                        { this.state.groupRoomPublicityLoading ?
                            <InlineSpinner /> : <div />
                        }
                    </h3>
                    <div>
                        <label>
                            <input type="radio"
                                value="public"
                                checked={this.state.groupRoom.isPublic}
                                onClick={this._changeGroupRoomPublicity}
                            />
                            <div className="mx_MemberInfo_label_text">
                                { _t('Visible to everyone') }
                            </div>
                        </label>
                    </div>
                    <div>
                        <label>
                            <input type="radio"
                                value="private"
                                checked={!this.state.groupRoom.isPublic}
                                onClick={this._changeGroupRoomPublicity}
                            />
                            <div className="mx_MemberInfo_label_text">
                                { _t('Only visible to community members') }
                            </div>
                        </label>
                    </div>
                </div>;
        }

        const avatarUrl = this.context.matrixClient.mxcUrlToHttp(
            this.state.groupRoom.avatarUrl,
            36, 36, 'crop',
        );

        const groupRoomName = this.state.groupRoom.displayname;
        const avatar = <BaseAvatar name={groupRoomName} width={36} height={36} url={avatarUrl} />;
        return (
            <div className="mx_MemberInfo">
                <GeminiScrollbarWrapper autoshow={true}>
                    <AccessibleButton className="mx_MemberInfo_cancel" onClick={this._onCancel}>
                        <img src="img/cancel.svg" width="18" height="18" className="mx_filterFlipColor" />
                    </AccessibleButton>
                    <div className="mx_MemberInfo_avatar">
                        { avatar }
                    </div>

                    <EmojiText element="h2">{ groupRoomName }</EmojiText>

                    <div className="mx_MemberInfo_profile">
                        <div className="mx_MemberInfo_profileField">
                            { this.state.groupRoom.canonical_alias }
                        </div>
                    </div>

                    { adminTools }
                </GeminiScrollbarWrapper>
            </div>
        );
    }
};
