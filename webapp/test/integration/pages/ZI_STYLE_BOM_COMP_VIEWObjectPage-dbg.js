sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'zstylemasterfin.zstylemasterfin',
            componentId: 'ZI_STYLE_BOM_COMP_VIEWObjectPage',
            contextPath: '/ZI_Style_master_data_ROOT/_bom'
        },
        CustomPageDefinitions
    );
});