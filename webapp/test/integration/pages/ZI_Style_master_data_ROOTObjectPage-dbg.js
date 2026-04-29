sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'zstylemasterfin.zstylemasterfin',
            componentId: 'ZI_Style_master_data_ROOTObjectPage',
            contextPath: '/ZI_Style_master_data_ROOT'
        },
        CustomPageDefinitions
    );
});