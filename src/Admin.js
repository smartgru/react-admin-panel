import React, { PropTypes } from 'react';
import { combineReducers, createStore, compose, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import { Router, IndexRoute, Route, Redirect, hashHistory } from 'react-router';
import { syncHistoryWithStore, routerMiddleware, routerReducer } from 'react-router-redux';
import { reducer as formReducer } from 'redux-form';
import createSagaMiddleware from 'redux-saga';
import { fork } from 'redux-saga/effects';
import withProps from 'recompose/withProps';

import adminReducer from './reducer';
import { crudSaga } from './sideEffect/saga';
import CrudRoute from './CrudRoute';
import DefaultLayout from './mui/layout/Layout';
import SignIn from './mui/auth/SignIn';
import Logout from './mui/auth/Logout';
import TranslationProvider from './i18n/TranslationProvider';
import { DEFAULT_LOCALE, TranslationReducer as translationReducer } from './i18n';

const Admin = ({
    appLayout,
    authentication = {},
    children,
    customReducers = {},
    customSagas = [],
    dashboard,
    locale = DEFAULT_LOCALE,
    messages = {},
    restClient,
    theme,
    title = 'Admin on REST',
}) => {
    const resources = React.Children.map(children, ({ props }) => props);
    const reducer = combineReducers({
        admin: adminReducer(resources),
        form: formReducer,
        routing: routerReducer,
        locale: translationReducer(locale),
        ...customReducers,
    });
    const saga = function* rootSaga() {
        yield [
            crudSaga(restClient),
            ...customSagas,
        ].map(fork);
    };
    const sagaMiddleware = createSagaMiddleware();
    const store = createStore(reducer, undefined, compose(
        applyMiddleware(routerMiddleware(hashHistory), sagaMiddleware),
        window.devToolsExtension ? window.devToolsExtension() : f => f,
    ));
    sagaMiddleware.run(saga);

    const history = syncHistoryWithStore(hashHistory, store);
    const firstResource = resources[0].name;
    const {
        loginClient = () => Promise.resolve(),
        checkCredentials = () => true,
        SignInPage = withProps({ title, theme, loginClient })(SignIn),
        logoutClient,
        LogoutButton = withProps({ logoutClient })(Logout),
    } = authentication;
    const Layout = appLayout || withProps({ title, theme, logout: <LogoutButton /> })(DefaultLayout);

    return (
        <Provider store={store}>
            <TranslationProvider messages={messages}>
                <Router history={history}>
                    {dashboard ? undefined : <Redirect from="/" to={`/${firstResource}`} />}
                    <Route path="/sign-in" component={SignInPage} />
                    <Route path="/" component={Layout} resources={resources}>
                        {dashboard && <IndexRoute component={dashboard} onEnter={checkCredentials} />}
                        {resources.map(resource =>
                            <CrudRoute
                                key={resource.name}
                                path={resource.name}
                                list={resource.list}
                                create={resource.create}
                                edit={resource.edit}
                                show={resource.show}
                                remove={resource.remove}
                                options={resource.options}
                                checkCredentials={resource.checkCredentials || checkCredentials}
                            />
                        )}
                    </Route>
                </Router>
            </TranslationProvider>
        </Provider>
    );
};

const componentPropType = PropTypes.oneOfType([PropTypes.func, PropTypes.string]);

Admin.propTypes = {
    appLayout: componentPropType,
    authentication: PropTypes.object,
    children: PropTypes.node,
    customSagas: PropTypes.array,
    customReducers: PropTypes.object,
    dashboard: componentPropType,
    restClient: PropTypes.func,
    theme: PropTypes.object,
    title: PropTypes.string,
    locale: PropTypes.string,
    messages: PropTypes.object,
};

export default Admin;
